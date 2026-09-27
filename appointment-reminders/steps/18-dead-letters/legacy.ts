import { EntityTarget, ref } from '@3flows/platform';
import { Appointments, Customers } from './domain.js';

/** A row of the old booking system's export: `Name;Mobile;Date;Notes`. */
export type LegacyRow = { Name: string; Mobile: string; Date: string; Notes?: string };

/** The old system writes phone numbers with spaces: `+1 555 000 0001`. */
const toPhone = (mobile: string) => mobile.replaceAll(' ', '');

/** The old system writes dates as `2030-01-15 10:00`, in UTC. Anything else is rejected. */
const toIsoDate = (date: string) => {
    const match = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})$/.exec(date);
    if (!match) throw new Error(`Date ${date} is not in the format YYYY-MM-DD HH:mm`);
    return `${match[1]}T${match[2]}:00.000Z`;
};

/** Every row becomes a customer and an appointment that references it. */
export const fromLegacyRow: EntityTarget<LegacyRow>[] = [
    {
        entity: Customers,
        fields: {
            name: (row) => row.Name,
            phone: (row) => toPhone(row.Mobile)
        }
    },
    {
        entity: Appointments,
        fields: {
            at: (row) => toIsoDate(row.Date),
            customer: ref(Customers) // the customer produced from the same row
        }
    }
];
