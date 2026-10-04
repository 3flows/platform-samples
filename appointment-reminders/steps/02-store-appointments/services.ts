import { randomUUID } from 'node:crypto';
import { Register, Service, handler, t } from '@3flows/platform';

const BookAppointment = t.object({
    name: t.string(),
    phone: t.string(),
    at: t.string().datetime().describe('Start of the appointment, ISO 8601, e.g. 2030-01-15T10:00:00Z')
});

const Appointment = BookAppointment.extend({ id: t.string() });
type Appointment = t.infer<typeof Appointment>;

@Register()
export class AppointmentsService extends Service {
    handlers = () => [
        handler('bookAppointment', BookAppointment, Appointment, async (input, trigger) => {
            const appointment: Appointment = { id: randomUUID(), ...input };
            await trigger.context.doc().collection('appointments').by(appointment.id).set(appointment);
            await trigger.ok(appointment);
        }),

        handler('listAppointments', t.object({}).optional(), t.array(Appointment), async (_input, trigger) => {
            const appointments = await trigger.context.doc().collection('appointments').find({}).all<Appointment>();
            await trigger.ok(appointments);
        })
    ];
}
