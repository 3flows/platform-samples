import { randomUUID } from 'node:crypto';
import { Register, Route, Service, TriggerContext, handler, t } from '@3flows/platform';

const BookAppointment = t.object({
    name: t.string(),
    phone: t.string(),
    at: t.string().describe('ISO date-time of the appointment')
});

const Appointment = BookAppointment.extend({ id: t.string() });
type Appointment = t.infer<typeof Appointment>;

const DAY = 24 * 60 * 60 * 1000;

/** Appointments in the next 24 hours get a reminder. */
function isDueForReminder(appointment: Appointment, now = Date.now()): boolean {
    const at = new Date(appointment.at).getTime();
    return at > now && at - now <= DAY;
}

async function sendDueReminders({ doc, kv, sms, log }: TriggerContext): Promise<number> {
    const appointments = await doc().collection('appointments').find({}).all<Appointment>();
    let sent = 0;

    for (const appointment of appointments.filter((appointment) => isDueForReminder(appointment))) {
        const reminded = kv().bracket('reminded').key(appointment.id);
        if (await reminded.exists()) continue;

        await sms()
            .to(appointment.phone)
            .body(`Reminder: ${appointment.name}, your appointment is on ${appointment.at}.`)
            .send();
        await reminded.set(new Date().toISOString());

        log().stack(`Reminder SMS sent to ${appointment.phone}`).info();
        sent++;
    }
    return sent;
}

@Register()
export class AppointmentsService extends Service {
    handlers = () => [
        handler('bookAppointment', BookAppointment, Appointment, async (input, trigger) => {
            const { doc, mq } = trigger.context;
            const appointment: Appointment = { id: randomUUID(), ...input };

            await doc().collection('appointments').by(appointment.id).set(appointment);
            // Don't wait for the SMS provider: publish an event and answer right away.
            await mq().queue('appointment-booked').send(appointment);

            await trigger.ok(appointment);
        }),

        handler('listAppointments', t.object({}).optional(), t.array(Appointment), async (_input, trigger) => {
            const appointments = await trigger.context.doc().collection('appointments').find({}).all<Appointment>();
            await trigger.ok(appointments);
        }),

        // Lets you trigger the reminder run manually, e.g. from curl or a test.
        handler('sendDueReminders', t.object({}).optional(), t.object({ sent: t.number() }), async (_input, trigger) => {
            await trigger.ok({ sent: await sendDueReminders(trigger.context) });
        })
    ];

    routes(): Route {
        const route = super.routes();
        route.timer('reminders').do(async (_params, trigger) => {
            await sendDueReminders(trigger.context);
        });

        route.mq().queue('appointment-booked').do(async (appointment, trigger) => {
            const { name, phone, at } = appointment as Appointment;
            await trigger.context.sms().to(phone).body(`Hi ${name}, your appointment on ${at} is confirmed.`).send();
            trigger.context.log().stack(`Confirmation SMS sent to ${phone}`).info();
        });
        return route;
    }
}
