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

export const PipelineRun = t.object({
    runId: t.string(),
    pipeline: t.string(),
    status: t.string(),
    startedAt: t.string(),
    written: t.number(),
    invalid: t.number(),
    deadLettered: t.number()
});

export const LineageQuery = t.object({ asset: t.string().describe('Asset id, e.g. entity:Customer') });

export const LineageWrite = t.object({
    pipeline: t.string(),
    runId: t.string(),
    timestamp: t.string(),
    from: t.array(t.string()),
    written: t.number()
});
export type LineageWrite = t.infer<typeof LineageWrite>;

@Register()
export class DataExchangeService extends Service {
    handlers = () => [
        // Every pipeline run: when, which pipeline, and how it went.
        handler('pipelineRuns', t.object({}).optional(), t.array(PipelineRun), async (_input, trigger) => {
            const runs = await trigger.context
                .doc()
                .db('datahub')
                .collection('lineage_runs')
                .find({})
                .sort({ startedAt: -1 })
                .all<any>();

            await trigger.ok(
                runs.map(({ _id, pipeline, status, startedAt, report }) => ({
                    runId: _id,
                    pipeline,
                    status,
                    startedAt,
                    written: report.written,
                    invalid: report.invalid,
                    deadLettered: report.deadLettered
                }))
            );
        }),

        // Where does the data of an asset come from? Every write into it, with the pipeline and its sources.
        handler('lineage', LineageQuery, t.array(LineageWrite), async ({ asset }, trigger) => {
            const writes = await trigger.context
                .doc()
                .db('datahub')
                .collection('lineage_events')
                .find({ operation: 'write', 'output.id': asset })
                .sort({ timestamp: -1 })
                .all<any>();

            await trigger.ok(
                writes.map(({ pipeline, runId, timestamp, input, records }) => ({
                    pipeline,
                    runId,
                    timestamp,
                    from: input.map((source: { id: string }) => source.id),
                    written: records.written
                }))
            );
        }),

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
