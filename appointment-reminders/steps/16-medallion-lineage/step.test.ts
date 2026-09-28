import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Platform, Service } from '@3flows/platform';
import { post } from '../_shared/test-helpers.js';
import { Appointments, Customers } from './domain.js';
import './appointments.js';
import './notifications.js';
import './exchange.js';
import './pipelines.js';
import type { DeadLetter, LineageWrite } from './exchange.js';
import { seedPractice } from './seed.js';

const base = 'http://127.0.0.1:3000';

const legacyExport = [
    'Name;Mobile;Date;Notes',
    'Ada Lovelace;+1 555 000 0001;2030-01-15 10:00;first visit',
    'No Phone;;2030-01-16 11:00;',
    'Bad Date;+1 555 000 0004;someday;',
    'Grace Hopper;+1 555 000 0002;2030-01-17 09:30;'
].join('\n');

async function upload(path: string, csv: string) {
    const response = await fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: csv });
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

function layer(db: string, collection: string) {
    return Platform.get<Service>('DataExchangeService').doc().db(db).collection(collection).find({}).all<any>();
}

describe('Step 16: medallion layers and lineage', () => {
    before(async () => {
        await Platform.run('./steps/16-medallion-lineage/platform.yml');
        await seedPractice();
    });

    after(async () => {
        await Platform.shutdown();
    });

    test('the pipeline passes bronze, silver and gold', async () => {
        const report = await upload('/data/imports/appointments', legacyExport);

        assert.equal(report.written, 4);
        assert.equal(report.deadLettered, 2);
        assert.deepEqual(
            report.lineage.find((event: any) => event.operation === 'transform').metadata.steps,
            ['csv', 'bronze', 'write:doc', 'map', 'silver', 'write:doc', 'gold', 'entities']
        );
    });

    test('bronze keeps every row exactly as it arrived, including the broken ones', async () => {
        const bronze = await layer('bronze', 'legacy_appointments');
        assert.equal(bronze.length, 4);
        assert.ok(bronze.every((record) => record.layer === 'bronze' && record.pipeline === 'appointment-import'));
        assert.deepEqual(bronze.find((record) => record.payload.Name === 'Bad Date').payload, {
            Name: 'Bad Date',
            Mobile: '+1 555 000 0004',
            Date: 'someday',
            Notes: ''
        });
    });

    test('silver holds the cleaned rows', async () => {
        const silver = await layer('silver', 'appointments');
        assert.equal(silver.length, 3); // the bad date could not be cleaned
        assert.deepEqual(silver.find((record) => record.payload.name === 'Ada Lovelace').payload, {
            name: 'Ada Lovelace',
            phone: '+15550000001',
            at: '2030-01-15T10:00:00.000Z'
        });
    });

    test('gold is the domain model', async () => {
        assert.equal(await Customers.find({}).count(), 2);
        assert.equal(await Appointments.find({}).count(), 2);
    });

    test('dead letters say at which stage a record failed', async () => {
        const letters = await post<DeadLetter[]>(`${base}/data/deadLetters`);
        assert.deepEqual(letters.map((letter) => letter.stage).sort(), ['entity', 'transform']);
    });

    test('every run is recorded', async () => {
        await post(`${base}/data/syncs/practice`);

        const runs = await post<any[]>(`${base}/data/pipelineRuns`);
        assert.deepEqual(runs.map((run) => run.pipeline).sort(), ['appointment-import', 'practice-sync']);
        assert.ok(runs.every((run) => run.status === 'succeeded'));
    });

    test('lineage answers: where do customers come from?', async () => {
        await Platform.get<Service>('AppointmentsService')
            .mq()
            .queue('crm-customers')
            .send({ fullName: 'Katherine Johnson', phone: '+15550000005' });
        await eventually(async () => (await Customers.find({ phone: '+15550000005' }).count()) === 1);

        const writes = await post<LineageWrite[]>(`${base}/data/lineage`, { asset: 'entity:Customer' });
        const sources = Object.fromEntries(writes.map((write) => [write.pipeline, write.from]));

        assert.deepEqual(sources, {
            'appointment-import': ['http:post:/appointments'],
            'practice-sync': ['sql:practice:practice-sync'],
            'crm-customers': ['mq:DEFAULT:queue:crm-customers']
        });
    });
});
