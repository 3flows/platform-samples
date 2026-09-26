import { randomUUID } from 'node:crypto';
import { Register, Route, Service, TriggerContext, handler, t } from '@3flows/platform';
import { Appointment, BookAppointment } from './model.js';

const DAY = 24 * 60 * 60 * 1000;

function isDueForReminder(appointment: Appointment, now = Date.now()): boolean {
    const at = new Date(appointment.at).getTime();
    return at > now && at - now <= DAY;
}

async function sendDueReminders({ doc, kv, service }: TriggerContext): Promise<number> {
    const appointments = await doc().collection('appointments').find({}).all<Appointment>();
    let sent = 0;

    for (const appointment of appointments.filter((appointment) => isDueForReminder(appointment))) {
        const reminded = kv().bracket('reminded').key(appointment.id);
        if (await reminded.exists()) continue;

        await service('NotificationsService').method('sendReminder').input(appointment).call();
        await reminded.set(new Date().toISOString());
        sent++;
    }
    return sent;
}

@Register()
export class AppointmentsService extends Service {
    handlers = () => [
        handler('bookAppointment', BookAppointment, Appointment, async (input, trigger) => {
            const { doc, service } = trigger.context;
            const appointment: Appointment = { id: randomUUID(), ...input };

            await doc().collection('appointments').by(appointment.id).set(appointment);
            await service('NotificationsService').method('appointmentBooked').input(appointment).call();

            await trigger.ok(appointment);
        }),

        handler('listAppointments', t.object({}).optional(), t.array(Appointment), async (_input, trigger) => {
            const appointments = await trigger.context.doc().collection('appointments').find({}).all<Appointment>();
            await trigger.ok(appointments);
        }),

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
