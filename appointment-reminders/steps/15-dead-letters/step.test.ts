import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Platform, Service } from '@3flows/platform';
import { post } from '../_shared/test-helpers.js';
import { Appointments, Customers } from './domain.js';
import './appointments.js';
import './notifications.js';
import './exchange.js';
import './pipelines.js';
import type { DeadLetter } from './exchange.js';

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

const deadLetters = () => post<DeadLetter[]>(`${base}/data/deadLetters`);

describe('Step 15: dead letters', () => {
    before(async () => {
        await Platform.run('./steps/15-dead-letters/platform.yml');
    });

    after(async () => {
        await Platform.shutdown();
    });

    test('valid rows are imported, invalid rows are dead-lettered', async () => {
        const report = await upload('/data/imports/appointments', legacyExport);

        assert.equal(report.written, 4);
        assert.equal(report.invalid, 2);
        assert.equal(report.deadLettered, 2);
        assert.equal(await Customers.find({}).count(), 2);
        assert.equal(await Appointments.find({}).count(), 2);
    });

    test('a dead letter keeps the input as it arrived, and says what went wrong', async () => {
        const letters = await deadLetters();
        assert.equal(letters.length, 2);

        const noPhone = letters.find((letter) => letter.input.Name === 'No Phone')!;
        assert.equal(noPhone.pipeline, 'appointment-import');
        assert.equal(noPhone.stage, 'entity');
        assert.equal(noPhone.error, 'Key field phone of Customer is missing');

        const badDate = letters.find((letter) => letter.input.Name === 'Bad Date')!;
        assert.equal(badDate.error, 'Date someday is not in the format YYYY-MM-DD HH:mm');
        assert.equal(badDate.input.Mobile, '+1 555 000 0004');
    });

    test('broken CRM messages are dead-lettered too, instead of failing the queue', async () => {
        const service = Platform.get<Service>('AppointmentsService');
        await service.mq().queue('crm-customers').send({ fullName: 'Nobody' }); // no phone
        await service.mq().queue('crm-customers').send({ fullName: 'Katherine Johnson', phone: '+15550000005' });

        await eventually(async () => (await Customers.find({}).count()) === 3);
        await eventually(async () => (await deadLetters()).some((letter) => letter.pipeline === 'crm-customers'));

        const crm = (await deadLetters()).find((letter) => letter.pipeline === 'crm-customers')!;
        assert.deepEqual(crm.input, { fullName: 'Nobody' });
    });
});
