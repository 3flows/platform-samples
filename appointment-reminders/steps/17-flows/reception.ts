import { Flows, Platform, Register, Service, handler, t } from '@3flows/platform';
import type { ReferralBatch } from './flows.js';

export const PendingReview = t.object({
    runId: t.string(),
    practice: t.string(),
    referrals: t.array(t.object({ name: t.string(), phone: t.string(), at: t.string() })),
    since: t.string()
});
export type PendingReview = t.infer<typeof PendingReview>;

export const ReviewReferrals = t.object({
    runId: t.string().describe('The run of the referral flow, from the SMS to reception'),
    accepted: t.boolean(),
    by: t.string()
});

export const ReviewResult = t.object({ status: t.string(), output: t.any() });

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

        // Reception's decision resumes the waiting flow exactly where it stopped.
        handler('reviewReferrals', ReviewReferrals, ReviewResult, async ({ runId, accepted, by }, trigger) => {
            const report = await Platform.get<Flows>('flows').resume({
                event: 'referrals.reviewed',
                correlation: runId,
                payload: { accepted, by }
            });
            await trigger.ok({ status: report.status, output: report.output });
        })
    ];
}
