import { EntityTarget, ref } from '@3flows/platform';
import { Appointments, Customers } from './domain.js';

/** Bronze: a row of the old booking system's export, as it arrived: `Name;Mobile;Date;Notes`. */
export type LegacyRow = { Name: string; Mobile: string; Date: string; Notes?: string };

/** Silver: the same appointment, cleaned. Field names match the domain. */
export type CleanRow = { name: string; phone: string; at: string };

/** The old system writes dates as `2030-01-15 10:00`, in UTC. Anything else is rejected. */
const toIsoDate = (date: string) => {
    const match = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})$/.exec(date);
    if (!match) throw new Error(`Date ${date} is not in the format YYYY-MM-DD HH:mm`);
    return `${match[1]}T${match[2]}:00.000Z`;
};

/** Bronze → silver: rename columns, normalize phone numbers and dates, drop the notes. */
export const cleanLegacyRow = (row: LegacyRow): CleanRow => ({
    name: row.Name.trim(),
    phone: row.Mobile.replaceAll(' ', ''),
    at: toIsoDate(row.Date)
});

/** Silver → gold: clean rows map onto the domain by name. Only the relationship is explicit. */
export const fromCleanRow: EntityTarget<CleanRow>[] = [
    { entity: Customers },
    { entity: Appointments, fields: { customer: ref(Customers) } }
];
