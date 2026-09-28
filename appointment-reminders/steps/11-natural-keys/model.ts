import { t } from '@3flows/platform';

export const BookAppointment = t.object({
    name: t.string(),
    phone: t.string(),
    at: t.string().describe('ISO date-time of the appointment')
});

export const Appointment = BookAppointment.extend({ id: t.string() });
export type Appointment = t.infer<typeof Appointment>;
