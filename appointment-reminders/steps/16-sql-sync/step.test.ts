import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Platform, SQL, SQLs } from '@3flows/platform';
import { post } from '../_shared/test-helpers.js';
import { Customers } from './domain.js';
import './appointments.js';
import './notifications.js';
import './exchange.js';
import './pipelines.js';
import type { PatientRow, PracticeSyncPipeline } from './pipelines.js';
import { seedPractice } from './seed.js';

const base = 'http://127.0.0.1:3000';

function practice(): SQL {
    return Platform.get<SQL>(Platform.get<SQLs>('sqls').registry['practice']);
}

describe('Step 16: sync from a database', () => {
    before(async () => {
        await Platform.run('./steps/16-sql-sync/platform.yml');
        await seedPractice();
    });

    after(async () => {
        await Platform.shutdown();
    });

    test('the sync runs every night and on demand', () => {
        const { triggers, source } = Platform.get<PracticeSyncPipeline>('PracticeSyncPipeline').definition();
        assert.deepEqual(
            triggers.map((trigger) => trigger.type),
            ['timer', 'http']
        );
        assert.equal(source?.type, 'sql');
    });

    test('active patients become customers', async () => {
        const report = await post(`${base}/data/syncs/practice`);

        assert.equal(report.read, 2);
        assert.equal(report.written, 2);
        assert.equal((await Customers.find({ phone: '+15550000011' }).next())?.data.name, 'Dorothy Vaughan');
        assert.equal(await Customers.find({ phone: '+15550000013' }).count(), 0); // inactive
    });

    test('running the sync again updates instead of duplicating', async () => {
        await practice().table<PatientRow>('patients').by(2).update({ last_name: 'Jackson-Smith' });

        await post(`${base}/data/syncs/practice`);

        assert.equal(await Customers.find({}).count(), 2);
        assert.equal((await Customers.find({ phone: '+15550000012' }).next())?.data.name, 'Mary Jackson-Smith');
    });

    test('the pipeline can also be run directly, e.g. from a test or a handler', async () => {
        const report = await Platform.get<PracticeSyncPipeline>('PracticeSyncPipeline').run({});
        assert.equal(report.written, 2);
    });
});
