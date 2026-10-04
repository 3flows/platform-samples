import { domain } from '@3flows/platform';

/** The scheduling domain: who our customers are, and when they come. */
export const Scheduling = domain('Scheduling', (d) => {
    const Customer = d.entity('Customer', {
        name: d.string(),
        phone: d.string()
    });

    const Appointment = d.entity('Appointment', {
        at: d.string(),
        customer: d.one(Customer).inverse('appointments')
    });

    return { Customer, Appointment };
});

export const Customers = Scheduling.Customer;
export const Appointments = Scheduling.Appointment;
