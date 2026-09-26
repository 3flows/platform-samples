import { Register, Service, handler, t } from '@3flows/platform';

@Register()
export class AppointmentsService extends Service {
    handlers = () => [
        handler(
            'hello',
            t.object({ name: t.string() }),
            t.object({ message: t.string() }),
            async ({ name }, trigger) => {
                await trigger.ok({ message: `Hello ${name}, welcome to appointment reminders!` });
            }
        )
    ];
}
