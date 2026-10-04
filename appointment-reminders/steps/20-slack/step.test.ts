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
import { RECEPTION_CHANNEL, type PendingReview } from './reception.js';
import { seedPractice } from './seed.js';

const base = 'http://127.0.0.1:3000';
const slack = 'http://127.0.0.1:3002';
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

/** What Slack would send when somebody reacts to a message in the reception channel. */
function reaction(id: string, ts: string, reaction: string, user: string) {
    return post(`${slack}/inject`, {
        id,
        type: 'reaction.added',
        payload: { type: 'reaction_added', user, reaction, item: { type: 'message', channel: RECEPTION_CHANNEL, ts } }
    });
}

function flowRun(runId: string) {
    return Platform.get<Service>('ReceptionService').doc().db('datahub').collection('flow_runs').by(runId).get<any>();
}

describe('Step 20: reception works in Slack', () => {
    let runId: string;
    let ts: string;

    before(async () => {
        await Platform.run('./steps/20-slack/platform.yml');
        await seedPractice();
    });

    after(async () => {
        await Platform.shutdown();
    });

    test('a referral batch is posted to the reception channel, and the flow waits for that message', async () => {
        const report = await post(`${base}/data/flows/referrals`, batch);
        runId = report.runId;
        ts = report.steps['notify-reception'].result.ts;

        assert.equal(report.status, 'waiting');
        assert.equal(report.waiting.correlation, ts);

        const { messages } = await post(`${slack}/outbox`);
        assert.equal(messages.length, 1);
        assert.equal(messages[0].channel, RECEPTION_CHANNEL);
        assert.match(messages[0].text, /3 referrals from Hopper Family Practice are waiting for review/);
    });

    test('nobody is imported or texted before the review', async () => {
        assert.equal(await Customers.find({}).count(), 0);
        assert.equal(sentSms('+15550000011').length, 0);
        assert.equal((await post<PendingReview[]>(`${base}/reception/pendingReviews`))[0].runId, runId);
    });

    test('a ✅ reaction on the message accepts the batch; the Slack user is recorded', async () => {
        assert.deepEqual(await reaction('Ev01', ts, 'white_check_mark', 'U0GRACE'), { ok: true, delivered: 1 });

        const run = await flowRun(runId);
        assert.equal(run.status, 'succeeded');
        assert.deepEqual(run.output, { accepted: true, by: 'U0GRACE', booked: 2 });
        assert.equal(await Customers.find({}).count(), 2);
        assert.equal(await Appointments.find({}).count(), 2);
        assert.equal(sentSms(partner)[0].body, 'Your referrals were accepted: 2 of 3 patients are booked.');
    });

    test('Slack delivering the same event again changes nothing', async () => {
        assert.deepEqual(await reaction('Ev01', ts, 'white_check_mark', 'U0GRACE'), { ok: true, delivered: 0 });
        assert.equal(sentSms(partner).length, 1);
    });

    test('other reactions and other channels are ignored', async () => {
        const declined = await post(`${base}/data/flows/referrals`, { ...batch, contact: '+15550000201' });
        const other = declined.steps['notify-reception'].result.ts;

        await reaction('Ev02', other, 'eyes', 'U0GRACE');
        await post(`${slack}/inject`, {
            id: 'Ev03',
            type: 'reaction.added',
            payload: { type: 'reaction_added', user: 'U0GRACE', reaction: 'x', item: { channel: 'C0RANDOM', ts: other } }
        });
        assert.equal((await flowRun(declined.runId)).status, 'waiting');

        await reaction('Ev04', other, 'x', 'U0GRACE');
        const run = await flowRun(declined.runId);
        assert.deepEqual(run.output, { accepted: false, by: 'U0GRACE', booked: 0 });
        assert.match(sentSms('+15550000201')[0].body, /can't take your 3 referrals/);
    });

    test('an event that keeps failing is retried, then dead-lettered with its error', async () => {
        // Ada reacts too, after Grace decided. No flow waits for that message anymore.
        assert.deepEqual(await reaction('Ev05', ts, 'x', 'U0ADA'), { ok: true, delivered: 1 });

        const failed = await Platform.get<Service>('ReceptionService').doc().db('datahub').collection('failed_events').by('Ev05').get<any>();
        assert.equal(failed.attempts, 3);
        assert.match(failed.error.message, /No waiting flow/);
        assert.equal((await flowRun(runId)).output.by, 'U0GRACE');
    });

    test('the manifest shows the connector, its events and its health', () => {
        const connector = Platform.inspect().connectors.find((entry) => entry.name === 'reception');
        assert.equal(connector?.type, 'slack-memory');
        assert.equal(connector?.provider, 'slack');
        assert.deepEqual(connector?.inbound?.retry, { attempts: 3, backoffMs: 200 });
        assert.deepEqual(connector?.inbound?.dlq, { queue: 'reception.failed' });
        assert.ok(connector?.events.some((event) => event.type === 'reaction.added'));
        assert.equal(connector?.health?.failedEvents, 1);
    });
});
