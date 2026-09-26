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

async function sendDueReminders({ doc, sms, log }: TriggerContext): Promise<number> {
    const appointments = await doc().collection('appointments').find({}).all<Appointment>();
    const due = appointments.filter((appointment) => isDueForReminder(appointment));

    for (const appointment of due) {
        // Problem: this runs on every timer tick, so the same customer is reminded again and again.
        await sms()
            .to(appointment.phone)
            .body(`Reminder: ${appointment.name}, your appointment is on ${appointment.at}.`)
            .send();
        log().stack(`Reminder SMS sent to ${appointment.phone}`).info();
    }
    return due.length;
}

@Register()
export class AppointmentsService extends Service {
    handlers = () => [
        handler('bookAppointment', BookAppointment, Appointment, async (input, trigger) => {
            const { doc, sms } = trigger.context;
            const appointment: Appointment = { id: randomUUID(), ...input };

            await doc().collection('appointments').by(appointment.id).set(appointment);
            await sms()
                .to(appointment.phone)
                .body(`Hi ${appointment.name}, your appointment on ${appointment.at} is confirmed.`)
                .send();

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
        return route;
    }
}
