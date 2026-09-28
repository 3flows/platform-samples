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

describe('Step 19: look inside with the admin API', () => {
    before(async () => {
        await Platform.run('./steps/19-admin/platform.yml');
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

    test('ontologies show the relationships', async () => {
        const ontologies = await get<any[]>('ontologies');
        const ontology = ontologies.find((item) => item.name === 'AppointmentsOntology');
        assert.equal(ontology.relationships[0].inverse, 'appointments');
    });

    test('reload is refused in read-only mode', async () => {
        const response = await fetch(`${base}/reload`, { method: 'POST' });
        assert.equal(response.status, 401);
    });
});
