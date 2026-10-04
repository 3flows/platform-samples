import { domain } from '@3flows/platform';

/** The scheduling domain: who our customers are, and when they come. */
export const Scheduling = domain('Scheduling', (d) => {
    // The phone number identifies a customer, wherever the data comes from.
    const Customer = d
        .entity(
            'Customer',
            {
                name: d.string().describe('Full name, as the customer gave it').example('Ada Lovelace'),
                phone: d
                    .string()
                    .describe('Mobile number in E.164 format, without spaces. Reminders are sent to it')
                    .alias('mobile')
                    .example('+15550000001')
            },
            { key: ['phone'] }
        )
        .describe('A person who books appointments with the practice. One customer per mobile number.')
        .alias('patient');

    // A customer has at most one appointment at a given time.
    const Appointment = d
        .entity(
            'Appointment',
            {
                at: d
                    .string()
                    .describe('Start of the appointment, ISO 8601 in UTC. A reminder is sent in the 24 hours before')
                    .example('2030-01-15T10:00:00.000Z'),
                customer: d.one(Customer).inverse('appointments').describe('The customer who comes to the appointment')
            },
            { key: ['customer', 'at'] }
        )
        .describe('A booked time slot for one customer. Booking the same slot twice returns the same appointment.')
        .alias('booking');

    return { Customer, Appointment };
});

export const Customers = Scheduling.Customer;
export const Appointments = Scheduling.Appointment;
