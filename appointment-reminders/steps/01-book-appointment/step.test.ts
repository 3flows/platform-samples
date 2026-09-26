import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Platform } from '@3flows/platform';
import { inHours, post } from '../_shared/test-helpers.js';
import './services.js';

describe('Step 01: book an appointment', () => {
    before(async () => {
        await Platform.run('./steps/01-book-appointment/platform.yml');
    });

    after(async () => {
        await Platform.shutdown();
    });

    test('books and lists appointments', async () => {
        const booked = await post('http://127.0.0.1:3000/bookAppointment', {
            name: 'Ada',
            phone: '+15550000001',
            at: inHours(20)
        });
        assert.equal(booked.name, 'Ada');
        assert.equal(typeof booked.id, 'string');

        const appointments = await post('http://127.0.0.1:3000/listAppointments');
        assert.equal(appointments.length, 1);
        assert.equal(appointments[0].id, booked.id);
    });
});
