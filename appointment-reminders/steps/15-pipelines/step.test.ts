import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Platform, Service } from '@3flows/platform';
import { inHours } from '../_shared/test-helpers.js';
import { Appointments, Customers } from './domain.js';
import './appointments.js';
import './notifications.js';
import './exchange.js';
import './pipelines.js';
import type { AppointmentImportPipeline } from './pipelines.js';

const base = 'http://127.0.0.1:3000';

/** A timestamp in the old system's format: `2030-01-15 10:00`. */
const legacyDate = (iso: string) => iso.slice(0, 16).replace('T', ' ');

const legacyExport = [
    'Name;Mobile;Date;Notes',
    `Ada Lovelace;+1 555 000 0001;${legacyDate(inHours(20))};first visit`,
    `Ada Lovelace;+1 555 000 0001;${legacyDate(inHours(72))};`,
    `Grace Hopper;+1 555 000 0002;${legacyDate(inHours(72))};prefers mornings`,
    `No Phone;;${legacyDate(inHours(72))};`
].join('\n');

/** Uploads a file the way a browser or `curl --data-binary` does. */
async function upload(path: string, csv: string) {
    const response = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv
    });
    assert.equal(response.status, 200);
    return response.json();
}

async function eventually(check: () => Promise<boolean>, timeoutMs = 2000) {
    const startedAt = Date.now();
    while (!(await check())) {
        if (Date.now() - startedAt > timeoutMs) throw new Error('Timed out');
        await new Promise((resolve) => setTimeout(resolve, 20));
    }
}

describe('Step 15: pipelines', () => {
    before(async () => {
        await Platform.run('./steps/15-pipelines/platform.yml');
    });

    after(async () => {
        await Platform.shutdown();
    });

    test('the pipeline describes triggers, source, steps and sink', () => {
        const definition = Platform.get<AppointmentImportPipeline>('AppointmentImportPipeline').definition();

        assert.equal(definition.name, 'appointment-import');
        assert.deepEqual(definition.triggers, [{ type: 'http', method: 'post', path: '/appointments' }]);
        assert.deepEqual(definition.source, { type: 'trigger', select: 'stream' });
        assert.deepEqual(
            definition.steps.map((step) => step.type),
            ['csv', 'entities']
        );
        assert.deepEqual(definition.sink, { type: 'entity', mode: 'save', options: { batchSize: 500 } });
    });

    test('a CSV upload is streamed through the pipeline into entities', async () => {
        const report = await upload('/data/imports/appointments', legacyExport);

        assert.equal(report.name, 'appointment-import');
        assert.equal(report.emitted, 6);
        assert.equal(report.written, 6);
        assert.equal(report.invalid, 1);

        assert.equal(await Customers.find({}).count(), 2);
        assert.equal(await Appointments.find({}).count(), 3);
    });

    test('uploading the same file again changes nothing', async () => {
        await upload('/data/imports/appointments', legacyExport);
        assert.equal(await Customers.find({}).count(), 2);
        assert.equal(await Appointments.find({}).count(), 3);
    });

    test('customer updates from the CRM queue update the same customers', async () => {
        const service = Platform.get<Service>('AppointmentsService');
        await service.mq().queue('crm-customers').send({ fullName: 'Ada King, Countess of Lovelace', phone: '+15550000001' });
        await service.mq().queue('crm-customers').send({ fullName: 'Katherine Johnson', phone: '+15550000005' });

        await eventually(async () => (await Customers.find({}).count()) === 3);
        const ada = await Customers.find({ phone: '+15550000001' }).next();
        assert.equal(ada?.data.name, 'Ada King, Countess of Lovelace');
        assert.equal(await Appointments.references(ada!, 'customer').count(), 2);
    });

    test('the export still works', async () => {
        const response = await fetch(`${base}/data/exports/appointments.csv`);
        const rows = (await response.text()).split('\n').slice(1);
        assert.equal(rows.length, 3);
        assert.ok(rows.some((row) => row.includes('"Ada King, Countess of Lovelace"')));
    });
});
