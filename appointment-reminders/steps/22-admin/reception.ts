import { ConnectorEvent, Flows, Platform, Register, Route, Service, handler, t } from '@3flows/platform';
import { SlackReactionEvent, slack } from '@3flows/platform-connector-slack';
import type { ReferralBatch } from './flows.js';

/** The Slack channel reception works in. In a real deployment, this would come from configuration. */
export const RECEPTION_CHANNEL = 'C0RECEPTION';

/** Reception decides with a reaction on the review message. */
const ACCEPT = 'white_check_mark';
const DECLINE = 'x';

type Reaction = t.infer<typeof SlackReactionEvent>;
/** What the connector delivers when a Slack event can't be handled, even after its retries. */
type FailedEvent = { type: string; event: ConnectorEvent; attempts: number; error: { message: string } };

export const PendingReview = t.object({
    runId: t.string(),
    practice: t.string(),
    referrals: t.array(t.object({ name: t.string(), phone: t.string(), at: t.string() })),
    since: t.string()
});
export type PendingReview = t.infer<typeof PendingReview>;

@Register()
export class ReceptionService extends Service {
    handlers = () => [
        // Referral batches waiting for a decision. Flow runs are documents, so this is a query.
        handler('pendingReviews', t.object({}).optional(), t.array(PendingReview), async (_input, trigger) => {
            const runs = await trigger.context
                .doc()
                .db('datahub')
                .collection('flow_runs')
                .find({ name: 'referrals', status: 'waiting' })
                .sort({ startedAt: 1 })
                .all<any>();

            await trigger.ok(
                runs.map(({ runId, input, startedAt }: { runId: string; input: ReferralBatch; startedAt: string }) => ({
                    runId,
                    practice: input.practice,
                    referrals: input.referrals,
                    since: startedAt
                }))
            );
        }),

        // Ask reception in its Slack channel. The message's timestamp identifies the batch from now on.
        handler(
            'askForReview',
            t.object({ practice: t.string(), count: t.number() }),
            t.object({ ts: t.string() }),
            async ({ practice, count }, trigger) => {
                const message = await slack(trigger.context)
                    .connector('reception')
                    .channel(RECEPTION_CHANNEL)
                    .message(`${count} referrals from ${practice} are waiting for review. React with :${ACCEPT}: to accept or :${DECLINE}: to decline.`)
                    .send();
                await trigger.ok({ ts: message.ts! });
            }
        )
    ];

    routes(): Route {
        const route = super.routes();

        // A reaction on a review message is reception's decision. It resumes the flow that waits for that message.
        route.connector('reception').event('reaction.added').do(async (event, trigger) => {
            const { payload } = event as ConnectorEvent<Reaction>;
            if (payload.item?.channel !== RECEPTION_CHANNEL) return;
            if (payload.reaction !== ACCEPT && payload.reaction !== DECLINE) return;

            await Platform.get<Flows>('flows').resume({
                event: 'referrals.reviewed',
                correlation: payload.item.ts!,
                payload: { accepted: payload.reaction === ACCEPT, by: payload.user ?? 'unknown' }
            });
            trigger.context.log().stack(`Referrals reviewed in Slack by ${payload.user}`).info();
        });

        // Slack events that still failed after their retries. Nothing is lost: here they are, with the error.
        route.mq().queue('reception.failed').do(async (failure, trigger) => {
            const { type, event, attempts, error } = failure as FailedEvent;
            trigger.context.log().stack(`Slack event ${type} ${event.id} failed ${attempts} times: ${error.message}`).warn();
            await trigger.context.doc().db('datahub').collection('failed_events').by(event.id).set(failure as FailedEvent);
        });

        return route;
    }
}
