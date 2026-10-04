import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Platform } from '@3flows/platform';
import { inHours, post, sentSms } from '../_shared/test-helpers.js';
import { Appointments, Customers, Scheduling } from './domain.js';
import './appointments.js';
import './notifications.js';

const base = 'http://127.0.0.1:3000';

describe('Step 13: an assistant through MCP', () => {
    before(async () => {
        await Platform.run('./steps/13-mcp/platform.yml');
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

    test('the assistant only gets the tools we chose, plus the ontology tools', async () => {
        const { result } = await mcp('tools/list');
        const names = result.tools.map((tool: any) => tool.name);
        assert.ok(names.includes('book_appointment'));
        assert.ok(names.includes('list_appointments'));
        assert.ok(names.includes('ontology_describe_concept'));
        assert.ok(!names.some((name: string) => /delete|update|sendDueReminders/i.test(name)));
        const book = result.tools.find((tool: any) => tool.name === 'book_appointment');
        assert.deepEqual(book.inputSchema.required, ['name', 'phone', 'at']);
    });

    test('booking through the assistant runs the same handler: one appointment, one confirmation', async () => {
        const at = '2030-03-01T09:00:00.000Z';
        const { result } = await mcp('tools/call', { name: 'book_appointment', arguments: { name: 'Grace', phone: '+15550000004', at } });
        assert.equal(result.isError, undefined);
        assert.equal(result.structuredContent.name, 'Grace');
        assert.equal(sentSms('+15550000004').filter((m) => m.body.includes('is confirmed')).length, 1);
    });

    test('invalid tool input is refused without leaking details', async () => {
        const { result } = await mcp('tools/call', { name: 'book_appointment', arguments: { name: 'Grace', at: 'tomorrow' } });
        assert.equal(result.isError, true);
        assert.equal(result.content[0].text, 'Tool call failed: invalid input');
    });

    test('the assistant can read what a concept means before it acts', async () => {
        const { result } = await mcp('tools/call', { name: 'ontology_describe_concept', arguments: { concept: 'Customer' } });
        assert.match(result.structuredContent.description, /One customer per mobile number/);

        const card = await mcp('resources/read', { uri: 'ontology://scheduling/cards/Appointment' });
        assert.match(card.result.contents[0].text, /ISO 8601 in UTC/);
    });
});

async function mcp(method: string, params: unknown = {}): Promise<any> {
    return post(`${base}/mcp`, { jsonrpc: '2.0', id: 1, method, params });
}
