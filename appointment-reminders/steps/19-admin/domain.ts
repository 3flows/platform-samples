import { ENTITIES, ontology } from '@3flows/platform';

/** The appointments domain: entities, fields and relationships in one place. */
export const AppointmentsOntology = ontology('AppointmentsOntology', (o) => {
    // The phone number identifies a customer, wherever the data comes from.
    const Customer = o.entity(
        'Customer',
        {
            name: o.string(),
            phone: o.string()
        },
        { key: ['phone'] }
    );

    // A customer has at most one appointment at a given time.
    o.entity(
        'Appointment',
        {
            at: o.string(),
            customer: o.one(Customer).inverse('appointments')
        },
        { key: ['customer', 'at'] }
    );
});

export const Customers = ENTITIES['Customer'];
export const Appointments = ENTITIES['Appointment'];
