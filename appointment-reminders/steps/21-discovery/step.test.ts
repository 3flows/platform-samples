import assert from 'node:assert/strict';
import { ChildProcess, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { after, before, describe, test } from 'node:test';
import { Platform } from '@3flows/platform';
import { inHours, post, waitForHttp } from '../_shared/test-helpers.js';
import './domain.js';
import './appointments.js';
import './exchange.js';
import './pipelines.js';
import './flows.js';
import './reception.js';
import { RECEPTION_PHONE } from './notifications.js';

let registry: ChildProcess;
let notifications: ChildProcess;

/** Ask the notifications process (over JSON-RPC) how many SMS it delivered to a phone number. */
async function delivered(phone: string): Promise<number> {
    const response = await post('http://127.0.0.1:3001/.jsonrpc', { jsonrpc: '2.0', id: 1, method: 'outbox' });
    const mailbox = response.result.mailboxes.find((m: { address: string }) => m.address === phone);
    return mailbox?.messages ?? 0;
}

async function stop(child: ChildProcess) {
    if (child.exitCode !== null) return;
    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('exit', resolve));
}

/** Wait until the notifications process has registered itself. */
async function registered(service: string, timeoutMs = 5000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        const { registrations } = await post('http://127.0.0.1:3100/.registry/resolve', { service });
        if (registrations.length) return registrations;
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`${service} did not register`);
}

describe('Step 21: find services through a registry', () => {
    before(async () => {
        registry = spawn(process.execPath, ['dist/steps/21-discovery/registry-main.js'], { stdio: 'ignore' });
        await waitForHttp('http://127.0.0.1:3100/health');
        notifications = spawn(process.execPath, ['dist/steps/21-discovery/notifications-main.js'], { stdio: 'ignore' });
        await registered('NotificationsService');
        await Platform.run('./steps/21-discovery/appointments.yml');
    });

    after(async () => {
        await Platform.shutdown();
        await stop(notifications);
        await stop(registry);
    });

    test('the code is identical to step 19; only YAML changed', () => {
        for (const file of ['appointments', 'domain', 'exchange', 'flows', 'legacy', 'model', 'notifications', 'pipelines', 'reception', 'seed']) {
            assert.equal(
                readFileSync(`steps/21-discovery/${file}.ts`, 'utf8'),
                readFileSync(`steps/19-admin/${file}.ts`, 'utf8'),
                `${file}.ts differs from step 19`
            );
        }
    });

    test('NotificationsService is not running here, and appointments.yml has no URL for it', () => {
        assert.equal(Platform.has('NotificationsService'), false);
        assert.doesNotMatch(readFileSync('steps/21-discovery/appointments.yml', 'utf8'), /3001/);
    });

    test('the registry knows where NotificationsService runs, and what it can do', async () => {
        const [registration] = await registered('NotificationsService');
        assert.equal(registration.transports.jsonrpc.url, 'http://127.0.0.1:3001/.jsonrpc');
        assert.ok(registration.handlers.includes('appointmentBooked'));
        assert.equal(registration.status, 'ready');
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

    test('flow steps call the remote notifications process too', async () => {
        const report = await post('http://127.0.0.1:3000/data/flows/referrals', {
            practice: 'Hopper Family Practice',
            contact: '+15550000200',
            referrals: [{ name: 'Dorothy Vaughan', phone: '+15550000011', at: '2030-02-01T09:00:00.000Z' }]
        });
        assert.equal(report.status, 'waiting');
        assert.equal(await delivered(RECEPTION_PHONE), 1);

        await post('http://127.0.0.1:3000/reception/reviewReferrals', { runId: report.runId, accepted: true, by: 'Grace' });
        assert.equal(await delivered('+15550000200'), 1);
    });
});
