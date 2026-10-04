import assert from 'node:assert/strict';
import { ChildProcess, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { after, before, describe, test } from 'node:test';
import { Platform } from '@3flows/platform';
import { inHours, post, slackMessages, slackReaction, waitForHttp } from '../_shared/test-helpers.js';
import './domain.js';
import './appointments.js';
import './exchange.js';
import './pipelines.js';
import './flows.js';
import './reception.js';

let notifications: ChildProcess;

/** Ask the notifications process (over JSON-RPC) how many SMS it delivered to a phone number. */
async function delivered(phone: string): Promise<number> {
    const response = await post('http://127.0.0.1:3001/.jsonrpc', { jsonrpc: '2.0', id: 1, method: 'outbox' });
    const mailbox = response.result.mailboxes.find((m: { address: string }) => m.address === phone);
    return mailbox?.messages ?? 0;
}

describe('Step 24: run notifications in a separate process', () => {
    before(async () => {
        notifications = spawn(process.execPath, ['dist/steps/24-separate-processes/notifications-main.js'], {
            stdio: 'ignore'
        });
        await waitForHttp('http://127.0.0.1:3001/health');
        await Platform.run('./steps/24-separate-processes/appointments.yml');
    });

    after(async () => {
        await Platform.shutdown();
        if (notifications.exitCode === null) {
            notifications.kill('SIGTERM');
            await new Promise((resolve) => notifications.once('exit', resolve));
        }
    });

    test('the code is identical to step 23; only YAML changed', () => {
        for (const file of ['appointments', 'domain', 'exchange', 'flows', 'legacy', 'model', 'notifications', 'pipelines', 'reception', 'seed']) {
            assert.equal(
                readFileSync(`steps/24-separate-processes/${file}.ts`, 'utf8'),
                readFileSync(`steps/23-vaults/${file}.ts`, 'utf8'),
                `${file}.ts differs from step 23`
            );
        }
    });

    test('NotificationsService is not running in this process', () => {
        assert.equal(Platform.has('NotificationsService'), false);
    });

    test('the Twilio secret lives in the notifications process only', () => {
        const appointments = readFileSync('steps/24-separate-processes/appointments.yml', 'utf8');
        assert.doesNotMatch(appointments, /twilio/);
        assert.match(readFileSync('steps/24-separate-processes/notifications.yml', 'utf8'), /path: twilio/);
    });

    test('booking is confirmed by the remote notifications process', async () => {
        await post('http://127.0.0.1:3000/bookAppointment', { name: 'Ada', phone: '+15550000001', at: inHours(20) });
        assert.equal(await delivered('+15550000001'), 1);
    });

    test('reminders are sent by the remote notifications process exactly once', async () => {
        assert.equal((await post('http://127.0.0.1:3000/sendDueReminders')).sent, 1);
        assert.equal((await post('http://127.0.0.1:3000/sendDueReminders')).sent, 0);
        assert.equal(await delivered('+15550000001'), 2); // confirmation + one reminder
    });

    test('reception reviews in Slack here; the practice is told by the remote notifications process', async () => {
        const report = await post('http://127.0.0.1:3000/data/flows/referrals', {
            practice: 'Hopper Family Practice',
            contact: '+15550000200',
            referrals: [{ name: 'Dorothy Vaughan', phone: '+15550000011', at: '2030-02-01T09:00:00.000Z' }]
        });
        assert.equal(report.status, 'waiting');
        assert.match((await slackMessages())[0].text, /1 referrals from Hopper Family Practice/);

        await slackReaction(report.steps['notify-reception'].result.ts, 'white_check_mark', 'U0GRACE');
        assert.equal(await delivered('+15550000200'), 1);
    });
});
