import { t } from '@3flows/platform';

export const BookAppointment = t.object({
    name: t.string(),
    phone: t.string(),
    at: t.string().datetime().describe('Start of the appointment, ISO 8601, e.g. 2030-01-15T10:00:00Z')
});

export const Appointment = BookAppointment.extend({ id: t.string() });
export type Appointment = t.infer<typeof Appointment>;
