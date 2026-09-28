import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Platform } from '@3flows/platform';
import { inHours, post, sentSms } from '../_shared/test-helpers.js';
import { Appointments, Customers } from './domain.js';
import './appointments.js';
import './notifications.js';
import './exchange.js';

const base = 'http://127.0.0.1:3000';

/** A timestamp in the old system's format: `2030-01-15 10:00`. */
const legacyDate = (iso: string) => iso.slice(0, 16).replace('T', ' ');

const soon = legacyDate(inHours(20));
const later = legacyDate(inHours(72));

const legacyExport = [
    'Name;Mobile;Date;Notes',
    `Ada Lovelace;+1 555 000 0001;${soon};first visit`,
    `Ada Lovelace;+1 555 000 0001;${later};`,
    `Grace Hopper;+1 555 000 0002;${later};prefers mornings`,
    `No Phone;;${later};`,
    'Bad Date;+1 555 000 0004;someday;'
].join('\n');

describe('Step 12: import and export with transformers', () => {
    before(async () => {
        await Platform.run('./steps/12-transformers/platform.yml');
    });

    after(async () => {
        await Platform.shutdown();
    });

    test('an export of the old system becomes customers and appointments', async () => {
        const report = await post(`${base}/data/importAppointments`, { csv: legacyExport });

        assert.equal(report.read, 5);
        assert.equal(report.emitted, 6); // three rows, a customer and an appointment each
        assert.equal(report.invalid, 2);
        assert.deepEqual(report.unusedColumns, ['Notes']);
        assert.deepEqual(
            report.errors.map((error: any) => [error.index, error.entity]),
            [[4, 'Customer'], [5, 'Appointment']]
        );

        assert.equal(await Customers.find({}).count(), 2);
        assert.equal(await Appointments.find({}).count(), 3);
    });

    test('the mapping cleans the data on the way in', async () => {
        const ada = await Customers.find({ phone: '+15550000001' }).next();
        assert.equal(ada?.data.name, 'Ada Lovelace');
        assert.equal(await Appointments.references(ada!, 'customer').count(), 2);
    });

    test('importing the same file again creates no duplicates', async () => {
        await post(`${base}/data/importAppointments`, { csv: legacyExport });
        assert.equal(await Customers.find({}).count(), 2);
        assert.equal(await Appointments.find({}).count(), 3);
    });

    test('imported appointments are regular appointments and get reminders', async () => {
        assert.equal((await post(`${base}/sendDueReminders`)).sent, 1);
        assert.equal(sentSms('+15550000001').filter((m) => m.body.includes('Reminder')).length, 1);
        assert.equal(sentSms('+15550000001').filter((m) => m.body.includes('is confirmed')).length, 0);
    });

    test('appointments are exported as CSV, with the customer flattened', async () => {
        const response = await fetch(`${base}/data/exports/appointments.csv`);
        assert.equal(response.headers.get('content-type'), 'text/csv');

        const [header, ...rows] = (await response.text()).split('\n');
        assert.equal(header, '_id;at;customer._id;customer.name;customer.phone');
        assert.equal(rows.length, 3);
        assert.ok(rows.some((row) => row.includes('"Grace Hopper";"+15550000002"')));
    });
});
