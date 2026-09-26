import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Platform } from '@3flows/platform';
import { post } from '../_shared/test-helpers.js';
import './appointments.js';
import './notifications.js';

const base = 'http://127.0.0.1:3000';

describe('Step 09: operate the service', () => {
    before(async () => {
        await Platform.run('./steps/09-operations/platform.yml');
    });

    after(async () => {
        await Platform.shutdown();
    });

    test('/ping reports the status of the platform and its infrastructure', async () => {
        const ping = await (await fetch(`${base}/ping`)).json();
        assert.equal(ping.name, 'appointment-reminders');
        assert.equal(ping.status, 'OK');
        assert.ok(Array.isArray(ping.pings));
    });

    test('/healthz answers the liveness probe', async () => {
        const response = await fetch(`${base}/healthz`);
        assert.equal(response.status, 200);
        assert.equal(await response.text(), 'OK');
    });

    test('/openapi.json describes every handler', async () => {
        const openapi = await (await fetch(`${base}/openapi.json`)).json();
        assert.ok(openapi.paths['/bookAppointment']);
        assert.ok(openapi.paths['/listAppointments']);
    });

    test('/metrics is disabled and the default /health is gone', async () => {
        assert.equal((await fetch(`${base}/metrics`)).status, 404);
        assert.equal((await fetch(`${base}/health`)).status, 404);
    });

    test('JSON-RPC describes itself with rpc.schema', async () => {
        const response = await post(`${base}/.jsonrpc`, { jsonrpc: '2.0', id: 1, method: 'rpc.schema' });
        assert.deepEqual(Object.keys(response.result).sort(), ['bookAppointment', 'listAppointments', 'sendDueReminders']);
    });
});
