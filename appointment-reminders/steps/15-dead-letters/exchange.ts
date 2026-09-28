import { RecordCSVTransformer, Register, Route, Service, entityRecordTransformer, handler, t } from '@3flows/platform';
import { pipeline } from 'node:stream';
import { Appointments } from './domain.js';

export const DeadLetter = t.object({
    pipeline: t.string(),
    runId: t.string(),
    stage: t.string(),
    input: t.any(),
    error: t.string(),
    createdAt: t.string()
});
export type DeadLetter = t.infer<typeof DeadLetter>;

@Register()
export class DataExchangeService extends Service {
    handlers = () => [
        // Records the pipelines could not process, newest first, with the input as it arrived.
        handler('deadLetters', t.object({}).optional(), t.array(DeadLetter), async (_input, trigger) => {
            const deadLetters = await trigger.context
                .doc()
                .db('datahub')
                .collection('dead_letters')
                .find({})
                .sort({ createdAt: -1 })
                .all<any>();

            await trigger.ok(
                deadLetters.map(({ pipeline, runId, stage, input, error, createdAt }) => ({
                    pipeline,
                    runId,
                    stage,
                    input,
                    error: error.message,
                    createdAt
                }))
            );
        })
    ];

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
