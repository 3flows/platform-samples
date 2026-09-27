import {
    CSVTransformer,
    Entity,
    RecordCSVTransformer,
    Register,
    Route,
    Service,
    entitiesTransformer,
    entityRecordTransformer,
    handler,
    t
} from '@3flows/platform';
import { Readable, Writable, pipeline as pipe } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Appointments } from './domain.js';
import { LegacyRow, fromLegacyRow } from './legacy.js';

export const ImportAppointments = t.object({ csv: t.string().describe('Export of the old booking system') });

export const ImportReport = t.object({
    read: t.number(),
    emitted: t.number(),
    invalid: t.number(),
    errors: t.array(t.object({ index: t.number(), entity: t.string(), error: t.string() })),
    unusedColumns: t.array(t.string())
});

/** Saves every entity it receives, whatever its type. */
const save = () =>
    new Writable({
        objectMode: true,
        write(entity: Entity<any, any>, _encoding, next) {
            entity.save().then(() => next(), next);
        }
    });

@Register()
export class DataExchangeService extends Service {
    handlers = () => [
        // CSV text → rows → customers and appointments → saved.
        handler('importAppointments', ImportAppointments, ImportReport, async ({ csv }, trigger) => {
            const toEntities = entitiesTransformer<LegacyRow>(fromLegacyRow);

            await pipeline(Readable.from([Buffer.from(csv)]), new CSVTransformer({ delimiter: ';' }), toEntities, save());

            await trigger.ok(toEntities.report);
        })
    ];

    routes(): Route {
        const route = super.routes();

        // Appointments → flat records with the customer resolved → CSV, streamed to the client.
        route.http().get('/exports/appointments.csv').do(async (_params, trigger) => {
            const csv = pipe(
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
