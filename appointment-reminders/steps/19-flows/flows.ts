import { Flow, FlowContext, Register } from '@3flows/platform';
import type { CleanRow } from './legacy.js';

/** A batch of referrals from a partner practice. Each referral already has the shape of a clean row. */
export type ReferralBatch = { practice: string; contact: string; referrals: CleanRow[] };

/** What reception decided. It arrives later, when the flow is resumed. */
export type Review = { accepted: boolean; by: string };

type Context = FlowContext<ReferralBatch>;
const review = (ctx: Context) => ctx.event as Review;

/**
 * A partner practice refers patients: POST /data/flows/referrals.
 * Reception reviews every batch before anybody on it gets a text message from us.
 */
@Register()
export class ReferralFlow extends Flow {
    define() {
        return this.flow('referrals')
            .on.http().post('/referrals')
            .from.trigger().payload()

            // 1. Tell reception that a batch is waiting. SMS providers fail now and then, so try three times.
            .step('notify-reception')
                .call('NotificationsService')
                .method('referralsReceived')
                .input((ctx: Context) => ({ runId: ctx.runId, practice: ctx.input.practice, count: ctx.input.referrals.length }))
                .retry({ attempts: 3, backoffMs: 1000 })

            // 2. Wait for the review. That can take days. Meanwhile, the run is a document, not a process.
            .waitFor('review')
                .event('referrals.reviewed')
                .correlate((ctx: Context) => ctx.runId)
                .timeout('3d')

            // 3. Only an accepted batch becomes customers and appointments, through a pipeline.
            .when('accepted', (ctx: Context) => review(ctx).accepted)
                .step('import')
                    .pipeline('referral-import')
                    .input((ctx: Context) => ctx.input.referrals)
            .end()

            // 4. Tell the practice what happened to its referrals.
            .step('notify-practice')
                .call('NotificationsService')
                .method('referralsReviewed')
                .input((ctx: Context) => ({
                    phone: ctx.input.contact,
                    accepted: review(ctx).accepted,
                    booked: booked(ctx),
                    referred: ctx.input.referrals.length
                }))
                .retry({ attempts: 3, backoffMs: 1000 })

            .output((ctx: Context) => ({ accepted: review(ctx).accepted, by: review(ctx).by, booked: booked(ctx) }));
    }
}

/** Referrals that became appointments: everything the import read, minus what it rejected. */
function booked(ctx: Context): number {
    const report = ctx.step('import')?.report;
    return report ? report.read - report.invalid : 0;
}
