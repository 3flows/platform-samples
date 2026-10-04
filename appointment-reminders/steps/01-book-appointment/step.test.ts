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

    test('the input contract rejects bad requests before the handler runs', async () => {
        const response = await fetch('http://127.0.0.1:3000/bookAppointment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Bob', at: 'tomorrow' })
        });
        assert.equal(response.status, 400);
        assert.deepEqual(await response.json(), {
            type: 'about:blank',
            title: 'INVALID_INPUT',
            status: 400,
            detail: 'Invalid input for handler bookAppointment',
            instance: '/bookAppointment'
        });

        const appointments = await post('http://127.0.0.1:3000/listAppointments');
        assert.equal(appointments.length, 1); // still only Ada
    });

    test('JSON-RPC callers get the same contract, with the details of what is wrong', async () => {
        const { error } = await post('http://127.0.0.1:3000/.jsonrpc', {
            jsonrpc: '2.0',
            id: 1,
            method: 'bookAppointment',
            params: { name: 'Bob', at: 'tomorrow' }
        });
        assert.equal(error.code, 'INVALID_INPUT');
        const issues = JSON.parse(error.data.message);
        assert.deepEqual(issues.map((issue: { path: string[] }) => issue.path[0]).sort(), ['at', 'phone']);
    });
});
