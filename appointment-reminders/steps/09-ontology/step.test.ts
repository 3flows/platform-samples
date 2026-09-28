import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Platform } from '@3flows/platform';
import { inHours, post, sentSms } from '../_shared/test-helpers.js';
import { Appointments, AppointmentsOntology, Customers } from './domain.js';
import './appointments.js';
import './notifications.js';

const base = 'http://127.0.0.1:3000';

describe('Step 09: describe the model with an ontology', () => {
    before(async () => {
        await Platform.run('./steps/09-ontology/platform.yml');
    });

    after(async () => {
        await Platform.shutdown();
    });

    test('the ontology describes entities and relationships', () => {
        const description = AppointmentsOntology.describe();
        assert.deepEqual(
            description.entities.map((entity) => entity.name),
            ['Customer', 'Appointment']
        );
        assert.deepEqual(description.relationships, [
            {
                source: 'Appointment',
                name: 'customer',
                entity: 'Customer',
                cardinality: 'one',
                inverse: 'appointments',
                label: undefined
            }
        ]);
    });

    test('booking stores a customer and an appointment that references it', async () => {
        const booked = await post(`${base}/bookAppointment`, { name: 'Ada', phone: '+15550000001', at: inHours(20) });
        assert.equal(booked.name, 'Ada');

        const appointment = await Appointments.findById(booked.id);
        assert.equal(appointment?.data.customer.entity, 'Customer');
        assert.equal(typeof appointment?.data.created, 'number');
    });

    test('returning customers are recognized by phone number', async () => {
        await post(`${base}/bookAppointment`, { name: 'Ada', phone: '+15550000001', at: inHours(30) });
        assert.equal(await Customers.find({ phone: '+15550000001' }).count(), 1);
        assert.equal(await Appointments.find({}).count(), 2);
    });

    test('invalid data is rejected by the entity schema', async () => {
        await assert.rejects(() => Customers.create({ name: 'No phone' } as any));
    });

    test('confirmations and reminders still work', async () => {
        assert.equal(sentSms('+15550000001').filter((m) => m.body.includes('is confirmed')).length, 2);
        assert.equal((await post(`${base}/sendDueReminders`)).sent, 1);
        assert.equal((await post(`${base}/sendDueReminders`)).sent, 0);
    });
});
