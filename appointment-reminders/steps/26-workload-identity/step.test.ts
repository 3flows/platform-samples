import assert from 'node:assert/strict';
import { ChildProcess, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { after, before, describe, test } from 'node:test';
import { Platform, ServiceClient } from '@3flows/platform';
import { inHours, post, slackReaction, waitForHttp } from '../_shared/test-helpers.js';
import './domain.js';
import './appointments.js';
import './exchange.js';
import './pipelines.js';
import './flows.js';
import './reception.js';

let registry: ChildProcess;
let notifications: ChildProcess;

/**
 * Ask the notifications process how many SMS it delivered to a phone number.
 * Not with curl anymore: the call goes through the platform, so it carries the appointments workload's token.
 */
async function delivered(phone: string): Promise<number> {
    const outbox = await new ServiceClient().service('NotificationsService').method('outbox').call<any>();
    return outbox.mailboxes.find((m: { address: string }) => m.address === phone)?.messages ?? 0;
}

async function stop(child: ChildProcess) {
    if (child.exitCode !== null) return;
    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('exit', resolve));
}

async function registered(service: string, timeoutMs = 5000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        const { registrations } = await post('http://127.0.0.1:3100/.registry/resolve', { service });
        if (registrations.length) return registrations;
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`${service} did not register`);
}

describe('Step 26: workload identity', () => {
    before(async () => {
        registry = spawn(process.execPath, ['dist/steps/26-workload-identity/registry-main.js'], { stdio: 'ignore' });
        await waitForHttp('http://127.0.0.1:3100/health');
        notifications = spawn(process.execPath, ['dist/steps/26-workload-identity/notifications-main.js'], { stdio: 'ignore' });
        await registered('NotificationsService');
        await Platform.run('./steps/26-workload-identity/appointments.yml');
    });

    after(async () => {
        await Platform.shutdown();
        await stop(notifications);
        await stop(registry);
    });

    test('the code is identical to step 23; only YAML changed', () => {
        for (const file of ['appointments', 'domain', 'exchange', 'flows', 'legacy', 'model', 'notifications', 'pipelines', 'reception', 'seed']) {
            assert.equal(
                readFileSync(`steps/26-workload-identity/${file}.ts`, 'utf8'),
                readFileSync(`steps/23-vaults/${file}.ts`, 'utf8'),
                `${file}.ts differs from step 23`
            );
        }
    });

    test('notifications refuses callers without a token', async () => {
        const response = await fetch('http://127.0.0.1:3001/sendReminder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: 'x', name: 'Mallory', phone: '+15550006666', at: '2030-01-01T10:00:00Z' })
        });
        assert.equal(response.status, 401);
        assert.equal(await delivered('+15550006666'), 0);
    });

    test('notifications refuses tokens that were not signed with the shared key', async () => {
        const forged = await fetch('http://127.0.0.1:3001/sendReminder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // header.payload.signature, signed with some other key
                Authorization:
                    'Bearer eyJhbGciOiJIUzI1NiJ9.eyJ0eXAiOiJ3b3JrbG9hZCIsInN1YiI6Im1hbGxvcnkiLCJpc3MiOiJwbGF0Zm9ybTovL2lkZW50aXR5L2FwcG9pbnRtZW50LXJlbWluZGVycyIsImF1ZCI6InBsYXRmb3JtOi8vc2VydmljZXMvbm90aWZpY2F0aW9ucyJ9.c2lnbmVkLXdpdGgtdGhlLXdyb25nLWtleQ'
            },
            body: JSON.stringify({ id: 'x', name: 'Mallory', phone: '+15550006666', at: '2030-01-01T10:00:00Z' })
        });
        assert.equal(forged.status, 401);
    });

    test('the registry tells callers which audience to ask a token for', async () => {
        const [registration] = await registered('NotificationsService');
        assert.deepEqual(registration.identity, { audience: 'platform://services/notifications', required: true });
    });

    test('the appointments process signs its calls: booking is confirmed as before', async () => {
        await post('http://127.0.0.1:3000/bookAppointment', { name: 'Ada', phone: '+15550000001', at: inHours(20) });
        assert.equal(await delivered('+15550000001'), 1);
        assert.equal((await post('http://127.0.0.1:3000/sendDueReminders')).sent, 1);
        assert.equal(await delivered('+15550000001'), 2);
    });

    test('flow steps sign their calls too', async () => {
        const report = await post('http://127.0.0.1:3000/data/flows/referrals', {
            practice: 'Hopper Family Practice',
            contact: '+15550000200',
            referrals: [{ name: 'Dorothy Vaughan', phone: '+15550000011', at: '2030-02-01T09:00:00.000Z' }]
        });
        await slackReaction(report.steps['notify-reception'].result.ts, 'white_check_mark', 'U0GRACE');
        assert.equal(await delivered('+15550000200'), 1);
    });

    test('the signing key comes from the vault and is never shown', async () => {
        assert.match(readFileSync('steps/26-workload-identity/appointments.yml', 'utf8'), /\$vault: \{ path: workload-identity, key: signingKey \}/);
        const configuration = await (await fetch('http://127.0.0.1:3000/admin/api/configuration')).json();
        assert.doesNotMatch(JSON.stringify(configuration.identities), /dev-workload-signing-key/);
    });
});
