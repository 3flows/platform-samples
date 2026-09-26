import assert from 'node:assert/strict';
import { ChildProcess, spawn } from 'node:child_process';
import { after, before, describe, test } from 'node:test';
import { Platform } from '@3flows/platform';
import { inHours, post, waitForHttp } from '../_shared/test-helpers.js';
import './appointments.js';

let notifications: ChildProcess;

/** Ask the notifications process (over JSON-RPC) how many SMS it delivered to a phone number. */
async function delivered(phone: string): Promise<number> {
    const response = await post('http://127.0.0.1:3001/.jsonrpc', { jsonrpc: '2.0', id: 1, method: 'outbox' });
    const mailbox = response.result.mailboxes.find((m: { address: string }) => m.address === phone);
    return mailbox?.messages ?? 0;
}

describe('Step 08: run notifications in a separate process', () => {
    before(async () => {
        notifications = spawn(process.execPath, ['dist/steps/08-separate-processes/notifications-main.js'], {
            stdio: 'ignore'
        });
        await waitForHttp('http://127.0.0.1:3001/health');
        await Platform.run('./steps/08-separate-processes/appointments.yml');
    });

    after(async () => {
        await Platform.shutdown();
        if (notifications.exitCode === null) {
            notifications.kill('SIGTERM');
            await new Promise((resolve) => notifications.once('exit', resolve));
        }
    });

    test('NotificationsService is not running in this process', () => {
        assert.equal(Platform.has('NotificationsService'), false);
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
});
