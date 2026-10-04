import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Platform, Service } from '@3flows/platform';
import { post, sentSms } from '../_shared/test-helpers.js';
import { Appointments, Customers } from './domain.js';
import './appointments.js';
import './notifications.js';
import './exchange.js';
import './pipelines.js';
import './flows.js';
import './reception.js';
import { RECEPTION_PHONE } from './notifications.js';
import type { PendingReview } from './reception.js';
import { seedPractice } from './seed.js';

const base = 'http://127.0.0.1:3000';
const partner = '+15550000200';

const batch = {
    practice: 'Hopper Family Practice',
    contact: partner,
    referrals: [
        { name: 'Dorothy Vaughan', phone: '+15550000011', at: '2030-02-01T09:00:00.000Z' },
        { name: 'Mary Jackson', phone: '+15550000012', at: '2030-02-01T10:00:00.000Z' },
        { name: 'No Phone', phone: '', at: '2030-02-01T11:00:00.000Z' }
    ]
};

function flowRun(runId: string) {
    return Platform.get<Service>('ReceptionService').doc().db('datahub').collection('flow_runs').by(runId).get<any>();
}

describe('Step 19: flows', () => {
    let runId: string;

    before(async () => {
        await Platform.run('./steps/19-flows/platform.yml');
        await seedPractice();
    });

    after(async () => {
        await Platform.shutdown();
    });

    test('a referral batch starts a flow that stops and waits for reception', async () => {
        const report = await post(`${base}/data/flows/referrals`, batch);
        runId = report.runId;

        assert.equal(report.status, 'waiting');
        assert.deepEqual(report.waiting, { step: 'review', event: 'referrals.reviewed', correlation: runId, resumeFrom: 2, timeoutAt: report.waiting.timeoutAt });
        assert.equal(report.steps['notify-reception'].status, 'succeeded');
        assert.match(sentSms(RECEPTION_PHONE)[0].body, new RegExp(`3 referrals from Hopper Family Practice .*${runId}`));
    });

    test('nobody is imported, and nobody is texted, before the review', async () => {
        assert.equal(await Customers.find({}).count(), 0);
        assert.equal(sentSms('+15550000011').length, 0);
    });

    test('the waiting run is a document: reception can list what is waiting', async () => {
        assert.equal((await flowRun(runId)).status, 'waiting');

        const pending = await post<PendingReview[]>(`${base}/reception/pendingReviews`);
        assert.equal(pending.length, 1);
        assert.equal(pending[0].runId, runId);
        assert.equal(pending[0].referrals.length, 3);
    });

    test('accepting resumes the flow: the pipeline imports, the practice is told', async () => {
        const result = await post(`${base}/reception/reviewReferrals`, { runId, accepted: true, by: 'Grace' });

        assert.equal(result.status, 'succeeded');
        assert.deepEqual(result.output, { accepted: true, by: 'Grace', booked: 2 });
        assert.equal(await Customers.find({}).count(), 2);
        assert.equal(await Appointments.find({}).count(), 2);
        assert.equal(sentSms(partner)[0].body, 'Your referrals were accepted: 2 of 3 patients are booked.');
    });

    test('the run records every step, and the referral without a phone is a dead letter', async () => {
        const run = await flowRun(runId);
        assert.deepEqual(
            Object.values(run.steps).map((step: any) => [step.name, step.status]),
            [
                ['notify-reception', 'succeeded'],
                ['review', 'succeeded'],
                ['accepted', 'succeeded'],
                ['import', 'succeeded'],
                ['notify-practice', 'succeeded']
            ]
        );
        assert.equal(run.steps.import.report.deadLettered, 1);
        assert.deepEqual(await post<string[]>(`${base}/reception/pendingReviews`), []);
    });

    test('a batch can only be reviewed once', async () => {
        await assert.rejects(() => post(`${base}/reception/reviewReferrals`, { runId, accepted: false, by: 'Grace' }));
    });

    test('a declined batch imports nothing and the practice hears about it', async () => {
        const declined = await post(`${base}/data/flows/referrals`, {
            ...batch,
            contact: '+15550000201',
            referrals: [{ name: 'Annie Easley', phone: '+15550000013', at: '2030-02-02T09:00:00.000Z' }]
        });
        const result = await post(`${base}/reception/reviewReferrals`, { runId: declined.runId, accepted: false, by: 'Grace' });

        assert.deepEqual(result.output, { accepted: false, by: 'Grace', booked: 0 });
        assert.equal(await Customers.find({ phone: '+15550000013' }).count(), 0);
        assert.equal((await flowRun(declined.runId)).steps.accepted.result, false);
        assert.match(sentSms('+15550000201')[0].body, /can't take your 1 referrals/);
    });
});
