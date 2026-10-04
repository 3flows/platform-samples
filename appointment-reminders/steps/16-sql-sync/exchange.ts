import { RecordCSVTransformer, Register, Route, Service, entityRecordTransformer } from '@3flows/platform';
import { pipeline } from 'node:stream';
import { Appointments } from './domain.js';

@Register()
export class DataExchangeService extends Service {
    routes(): Route {
        const route = super.routes();

        // Appointments → flat records with the customer resolved → CSV, streamed to the client.
        route.http().get('/exports/appointments.csv').do(async (_params, trigger) => {
            const csv = pipeline(
                Appointments.find({}).asReadable(),
                entityRecordTransformer(Appointments, { with: ['customer'] }),
                new RecordCSVTransformer({ delimiter: ';' }),
                (error) => error && trigger.context.log().stack(`Export failed: ${error.message}`).error()
            );
            trigger.setReadble(csv, { mimeType: 'text/csv' });
            await trigger.ok();
        });

        return route;
    }
}
