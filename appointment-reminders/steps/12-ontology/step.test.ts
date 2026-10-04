import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Platform } from '@3flows/platform';
import { inHours, post, sentSms } from '../_shared/test-helpers.js';
import { Appointments, Customers, Scheduling } from './domain.js';
import './appointments.js';
import './notifications.js';

const base = 'http://127.0.0.1:3000';

describe('Step 12: the domain as an ontology', () => {
    before(async () => {
        await Platform.run('./steps/12-ontology/platform.yml');
    });

    after(async () => {
        await Platform.shutdown();
    });

    test('the domain declares the natural keys', () => {
        const [customer, appointment] = Scheduling.describe().entities;
        assert.deepEqual(customer.key, ['phone']);
        assert.deepEqual(appointment.key, ['customer', 'at']);
    });

    test('the identity is derived from the key, not from where the data was created', () => {
        const id = Customers.identify({ phone: '+15550000001' });
        assert.equal(id, Customers.identify({ name: 'Somebody else', phone: '+15550000001' }));
        assert.notEqual(id, Customers.identify({ phone: '+15550000002' }));
    });

    test('same phone, same customer: creating twice updates instead of duplicating', async () => {
        const first = await Customers.create({ name: 'Ada', phone: '+15550000009' });
        const second = await Customers.create({ name: 'Ada Lovelace', phone: '+15550000009' });

        assert.equal(first.data._id, second.data._id);
        assert.equal(await Customers.find({ phone: '+15550000009' }).count(), 1);
        assert.equal((await Customers.findById(first.data._id))?.data.name, 'Ada Lovelace');
    });

    test('returning customers are recognized without a lookup', async () => {
        await post(`${base}/bookAppointment`, { name: 'Bob', phone: '+15550000002', at: inHours(20) });
        await post(`${base}/bookAppointment`, { name: 'Bob', phone: '+15550000002', at: inHours(30) });

        assert.equal(await Customers.find({ phone: '+15550000002' }).count(), 1);
        assert.equal(await Appointments.find({}).count(), 2);
    });

    test('booking the same slot twice returns the same appointment and confirms once', async () => {
        const at = inHours(40);
        const first = await post(`${base}/bookAppointment`, { name: 'Cleo', phone: '+15550000003', at });
        const second = await post(`${base}/bookAppointment`, { name: 'Cleo', phone: '+15550000003', at });

        assert.equal(first.id, second.id);
        assert.equal(await Appointments.find({}).count(), 3);
        assert.equal(sentSms('+15550000003').filter((m) => m.body.includes('is confirmed')).length, 1);
    });

    test('a key field is required', async () => {
        await assert.rejects(() => Customers.create({ name: 'No phone' } as any));
    });

    test('GraphQL mutations respect the key too: adding a known customer updates it', async () => {
        await post(`${base}/bookAppointment`, { name: 'Ada', phone: '+15550000001', at: inHours(50) });
        const response = await post(`${base}/graphql`, {
            query: 'mutation { addCustomer(input: { name: "Ada Lovelace", phone: "+15550000001" }) { _id } }'
        });
        assert.equal(response.errors, undefined);

        const adas = await Customers.find({ phone: '+15550000001' }).all();
        assert.equal(adas.length, 1);
        assert.equal(adas[0].data.name, 'Ada Lovelace');
        assert.equal(await Appointments.references(adas[0], 'customer').count(), 1); // her appointment stays attached
    });

    test('GraphQL knows the types, but not what they mean', async () => {
        const response = await post(`${base}/graphql`, { query: '{ __type(name: "Customer") { description fields { name description } } }' });
        assert.equal(response.data.__type.description, null);
        assert.equal(response.data.__type.fields.find((field: any) => field.name === 'phone').description, null);
    });

    test('the ontology says what the concepts mean', async () => {
        const ontology = await (await fetch(`${base}/ontology`)).json();
        const customer = ontology.classes.find((entry: any) => entry.name === 'Customer');
        assert.match(customer.description, /One customer per mobile number/);
        assert.deepEqual(customer.aliases, ['patient']);
        assert.match(customer.fields.find((field: any) => field.name === 'phone').description, /E\.164/);
        assert.ok(ontology.relationships.some((relationship: any) => relationship.source === 'Appointment' && relationship.target === 'Customer'));
    });

    test('a concept card reads like documentation', async () => {
        const card = await (await fetch(`${base}/ontology/card.md?concept=Appointment`)).text();
        assert.match(card, /# Appointment/);
        assert.match(card, /at: string, required — Start of the appointment, ISO 8601 in UTC/);
        assert.match(card, /deleteAppointment: delete, side effects, requires confirmation/);
    });

    test('the same ontology in the formats of the semantic web', async () => {
        const turtle = await (await fetch(`${base}/ontology.ttl`)).text();
        assert.match(turtle, /ontology:Customer a owl:Class/);
        const jsonld = await (await fetch(`${base}/ontology.jsonld`)).json();
        assert.equal(jsonld['@type'], 'owl:Ontology');
    });
});
