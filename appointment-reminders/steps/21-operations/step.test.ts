import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Platform } from '@3flows/platform';
import { post } from '../_shared/test-helpers.js';
import './domain.js';
import './appointments.js';
import './notifications.js';
import './exchange.js';
import './pipelines.js';
import './flows.js';
import './reception.js';

const base = 'http://127.0.0.1:3000';

describe('Step 21: operate the service', () => {
    before(async () => {
        await Platform.run('./steps/21-operations/platform.yml');
    });

    after(async () => {
        await Platform.shutdown();
    });

    test('/ping reports the status of the platform and its infrastructure', async () => {
        const ping = await (await fetch(`${base}/ping`)).json();
        assert.equal(ping.name, 'appointment-reminders');
        assert.equal(ping.status, 'OK');
        assert.equal(ping.version, '0.1.0'); // from package.json
        // Pipelines and flows are services, so they report their health like any other service.
        const services = ping.pings.map((service: { service: string }) => service.service);
        assert.ok(services.includes('appointmentsservice::default'));
        assert.ok(services.includes('practicesyncpipeline::default'));
        assert.ok(services.includes('referralflow::default'));
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
        assert.ok(openapi.paths['/data/imports/appointments']); // a pipeline trigger
        assert.ok(openapi.paths['/data/flows/referrals']); // a flow trigger
        assert.ok(openapi.paths['/reception/pendingReviews']);
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
