import { Register, Route, Service, TriggerContext, handler, t } from '@3flows/platform';
import { Appointments, Customers } from './domain.js';
import { Appointment, BookAppointment } from './model.js';

const DAY = 24 * 60 * 60 * 1000;

function isDueForReminder(appointment: Appointment, now = Date.now()): boolean {
    const at = new Date(appointment.at).getTime();
    return at > now && at - now <= DAY;
}

/** The API shape of an appointment: the entity plus its customer. */
async function toAppointment(appointment: InstanceType<typeof Appointments>): Promise<Appointment> {
    const customer = await Customers.resolve(appointment.data.customer);
    return {
        id: appointment.data._id,
        at: appointment.data.at,
        name: customer?.data.name ?? 'unknown',
        phone: customer?.data.phone ?? 'unknown'
    };
}

async function listAppointments(): Promise<Appointment[]> {
    const appointments = await Appointments.find({}).all();
    return Promise.all(appointments.map(toAppointment));
}

async function sendDueReminders({ kv, service }: TriggerContext): Promise<number> {
    let sent = 0;

    for (const appointment of (await listAppointments()).filter((appointment) => isDueForReminder(appointment))) {
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
        handler('bookAppointment', BookAppointment, Appointment, async ({ name, phone, at }, trigger) => {
            // The phone number identifies the customer: same phone, same customer. No lookup needed.
            const customer = await Customers.create({ name, phone });

            // Customer and time identify the appointment, so booking twice returns the same appointment.
            const id = Appointments.identify({ customer: customer.reference(), at })!;
            const existing = await Appointments.findById(id);
            if (existing) return trigger.ok(await toAppointment(existing));

            const appointment = await toAppointment(await Appointments.create({ at, customer: customer.reference() }));
            await trigger.context.service('NotificationsService').method('appointmentBooked').input(appointment).call();
            await trigger.ok(appointment);
        }),

        handler('listAppointments', t.object({}).optional(), t.array(Appointment), async (_input, trigger) => {
            await trigger.ok(await listAppointments());
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
