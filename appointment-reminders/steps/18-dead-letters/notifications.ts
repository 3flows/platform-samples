import { Register, Route, Service, handler, t } from '@3flows/platform';
import { Appointment } from './model.js';

@Register()
export class NotificationsService extends Service {
    handlers = () => [
        // Accept the event quickly; the SMS is sent asynchronously from the queue.
        handler('appointmentBooked', Appointment, t.object({ queued: t.boolean() }), async (appointment, trigger) => {
            await trigger.context.mq().queue('confirmations').send(appointment);
            await trigger.ok({ queued: true });
        }),

        handler('sendReminder', Appointment, t.object({ sent: t.boolean() }), async ({ name, phone, at }, trigger) => {
            await trigger.context.sms().to(phone).body(`Reminder: ${name}, your appointment is on ${at}.`).send();
            trigger.context.log().stack(`Reminder SMS sent to ${phone}`).info();
            await trigger.ok({ sent: true });
        }),

        // Shows what the SMS provider delivered; handy while developing with the memory provider.
        handler('outbox', t.object({}).optional(), t.any(), async (_input, trigger) => {
            await trigger.ok(await trigger.context.sms().info());
        })
    ];

    routes(): Route {
        const route = super.routes();
        route.mq().queue('confirmations').do(async (appointment, trigger) => {
            const { name, phone, at } = appointment as Appointment;
            await trigger.context.sms().to(phone).body(`Hi ${name}, your appointment on ${at} is confirmed.`).send();
            trigger.context.log().stack(`Confirmation SMS sent to ${phone}`).info();
        });
        return route;
    }
}
