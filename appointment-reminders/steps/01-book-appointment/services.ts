import { randomUUID } from 'node:crypto';
import { Register, Service, handler, t } from '@3flows/platform';

const BookAppointment = t.object({
    name: t.string(),
    phone: t.string(),
    at: t.string().describe('ISO date-time of the appointment')
});

const Appointment = BookAppointment.extend({ id: t.string() });
type Appointment = t.infer<typeof Appointment>;

@Register()
export class AppointmentsService extends Service {
    // Problem: this list lives in memory of this one instance and is lost on restart.
    appointments: Appointment[] = [];

    handlers = () => [
        handler('bookAppointment', BookAppointment, Appointment, async (input, trigger) => {
            const appointment = { id: randomUUID(), ...input };
            this.appointments.push(appointment);
            await trigger.ok(appointment);
        }),

        handler('listAppointments', t.object({}).optional(), t.array(Appointment), async (_input, trigger) => {
            await trigger.ok(this.appointments);
        })
    ];
}
