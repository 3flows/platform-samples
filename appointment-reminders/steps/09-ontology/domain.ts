import { ENTITIES, ontology } from '@3flows/platform';

/** The appointments domain: entities, fields and relationships in one place. */
export const AppointmentsOntology = ontology('AppointmentsOntology', (o) => {
    const Customer = o.entity('Customer', {
        name: o.string(),
        phone: o.string()
    });

    o.entity('Appointment', {
        at: o.string(),
        customer: o.one(Customer).inverse('appointments')
    });
});

export const Customers = ENTITIES['Customer'];
export const Appointments = ENTITIES['Appointment'];
