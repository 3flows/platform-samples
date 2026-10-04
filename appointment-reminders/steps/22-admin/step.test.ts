import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Platform } from '@3flows/platform';
import './domain.js';
import './appointments.js';
import './notifications.js';
import './exchange.js';
import './pipelines.js';
import './flows.js';
import './reception.js';

const base = 'http://127.0.0.1:3000/admin/api';

async function get<T = any>(path: string): Promise<T> {
    const response = await fetch(`${base}/${path}`);
    assert.equal(response.status, 200);
    return (await response.json()) as T;
}

describe('Step 22: look inside with the admin API', () => {
    before(async () => {
        await Platform.run('./steps/22-admin/platform.yml');
    });

    after(async () => {
        await Platform.shutdown();
    });

    test('summary shows a running, read-only platform', async () => {
        const summary = await get('summary');
        assert.equal(summary.running, true);
        assert.equal(summary.readonly, true);
        assert.equal(summary.reloadEnabled, false);
    });

    test('services lists what is running', async () => {
        const services = await get<any[]>('services');
        assert.ok(services.some((service) => service.id === 'appointmentsservice::default'));
        assert.ok(services.some((service) => service.id === 'notificationsservice::default'));
        assert.ok(services.some((service) => service.id === 'practicesyncpipeline::default'));
        assert.ok(services.some((service) => service.id === 'referralflow::default'));
        assert.ok(services.every((service) => service.status === 'READY'));
    });

    test('entities show fields and storage mapping', async () => {
        const entities = await get<any[]>('entities');
        const appointment = entities.find((entity) => entity.name === 'Appointment');
        assert.equal(appointment.backend, 'docs');
        assert.equal(appointment.db, 'appointments');
        assert.ok(appointment.fields.some((field: any) => field.name === 'at'));
        assert.deepEqual(appointment.key, ['customer', 'at']);
    });

    test('domains show entities, keys and relationships', async () => {
        const domains = await get<any[]>('domains');
        const scheduling = domains.find((item) => item.name === 'Scheduling');
        assert.deepEqual(scheduling.entities.map((entity: any) => entity.name), ['Customer', 'Appointment']);
        assert.equal(scheduling.relationships[0].inverse, 'appointments');
    });

    test('the manifest describes the running platform: services with their contracts, providers, connectors', () => {
        const manifest = Platform.inspect();
        assert.equal(manifest.runtime.running, true);
        assert.equal(manifest.instance.applicationVersion, '0.1.0');

        const appointments = manifest.services.find((service) => service.serviceName === 'AppointmentsService');
        const book = appointments?.handlers.find((handler) => handler.name === 'bookAppointment');
        assert.deepEqual((book?.inputSchema as any).required, ['name', 'phone', 'at']);

        assert.ok(manifest.providers.some((provider) => provider.id === 'sms::memory::default'));
        assert.equal(manifest.connectors[0].name, 'reception');
        assert.deepEqual(manifest.domains[0].entities.map((entity) => entity.name), ['Customer', 'Appointment']);
    });

    test('reload is refused in read-only mode', async () => {
        const response = await fetch(`${base}/reload`, { method: 'POST' });
        assert.equal(response.status, 401);
    });
});
