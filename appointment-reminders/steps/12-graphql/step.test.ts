import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Platform } from '@3flows/platform';
import { inHours, post } from '../_shared/test-helpers.js';
import './domain.js';
import './appointments.js';
import './notifications.js';

const base = 'http://127.0.0.1:3000';

async function graphql<T = any>(query: string): Promise<T> {
    const response = await post(`${base}/graphql`, { query });
    if (response.errors) throw new Error(JSON.stringify(response.errors));
    return response.data as T;
}

describe('Step 12: GraphQL from the ontology', () => {
    before(async () => {
        await Platform.run('./steps/12-graphql/platform.yml');
        await post(`${base}/bookAppointment`, { name: 'Ada', phone: '+15550000001', at: inHours(20) });
        await post(`${base}/bookAppointment`, { name: 'Ada', phone: '+15550000001', at: inHours(48) });
        await post(`${base}/bookAppointment`, { name: 'Bob', phone: '+15550000002', at: inHours(30) });
    });

    after(async () => {
        await Platform.shutdown();
    });

    test('customers with their appointments, following the inverse relationship', async () => {
        const { customers } = await graphql(`{
            customers(sort: [{ column: "name" }]) {
                totalCount
                elements { name phone appointments { totalCount } }
            }
        }`);
        assert.equal(customers.totalCount, 2);
        assert.deepEqual(
            customers.elements.map((c: any) => [c.name, c.appointments.totalCount]),
            [['Ada', 2], ['Bob', 1]]
        );
    });

    test('appointments with their customer', async () => {
        const { appointments } = await graphql(`{
            appointments { elements { at customer { name } } }
        }`);
        assert.equal(appointments.elements.length, 3);
        assert.ok(appointments.elements.every((a: any) => typeof a.customer.name === 'string'));
    });

    test('generated mutations write through the same entities', async () => {
        const { addCustomer } = await graphql(`mutation {
            addCustomer(input: { name: "Cleo", phone: "+15550000003" }) { _id name }
        }`);
        assert.equal(addCustomer.name, 'Cleo');

        const { countCustomers } = await graphql(`{ countCustomers }`);
        assert.equal(countCustomers, 3);
    });
});
