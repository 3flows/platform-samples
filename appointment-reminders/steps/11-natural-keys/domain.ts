import { domain } from '@3flows/platform';

/** The scheduling domain: who our customers are, and when they come. */
export const Scheduling = domain('Scheduling', (d) => {
    // The phone number identifies a customer, wherever the data comes from.
    const Customer = d.entity(
        'Customer',
        {
            name: d.string(),
            phone: d.string()
        },
        { key: ['phone'] }
    );

    // A customer has at most one appointment at a given time.
    const Appointment = d.entity(
        'Appointment',
        {
            at: d.string(),
            customer: d.one(Customer).inverse('appointments')
        },
        { key: ['customer', 'at'] }
    );

    return { Customer, Appointment };
});

export const Customers = Scheduling.Customer;
export const Appointments = Scheduling.Appointment;
