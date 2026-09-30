import { Register, Route, Service, handler, t } from '@3flows/platform';
import { Appointment } from './model.js';

/** Reception's phone. In a real deployment, this would come from configuration. */
export const RECEPTION_PHONE = '+15550000100';

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

        // A partner practice referred patients. Reception has to review them.
        handler(
            'referralsReceived',
            t.object({ runId: t.string(), practice: t.string(), count: t.number() }),
            t.object({ sent: t.boolean() }),
            async ({ runId, practice, count }, trigger) => {
                await trigger.context.sms().to(RECEPTION_PHONE).body(`${count} referrals from ${practice} are waiting for review: ${runId}`).send();
                await trigger.ok({ sent: true });
            }
        ),

        // Reception reviewed a batch. The practice hears how it went.
        handler(
            'referralsReviewed',
            t.object({ phone: t.string(), accepted: t.boolean(), booked: t.number(), referred: t.number() }),
            t.object({ sent: t.boolean() }),
            async ({ phone, accepted, booked, referred }, trigger) => {
                const body = accepted
                    ? `Your referrals were accepted: ${booked} of ${referred} patients are booked.`
                    : `We can't take your ${referred} referrals at the moment. Please call reception.`;
                await trigger.context.sms().to(phone).body(body).send();
                await trigger.ok({ sent: true });
            }
        ),

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
