import { Pipeline, Register } from '@3flows/platform';
import { Customers } from './domain.js';
import { cleanLegacyRow, fromCleanRow } from './legacy.js';

/** Upload of the old system's CSV export: POST /data/imports/appointments with Content-Type text/csv. */
@Register()
export class AppointmentImportPipeline extends Pipeline {
    define() {
        return this.pipeline('appointment-import')
            .on.http().post('/appointments')
            .from.trigger().stream()
            .parse.csv({ delimiter: ';' })
            .bronze() // raw: every row exactly as it arrived, kept for replay and audits
            .doc().db('bronze').collection('legacy_appointments')
            .map(cleanLegacyRow)
            .silver() // clean: consistent names, phone numbers and dates
            .doc().db('silver').collection('appointments')
            .gold() // the domain model
            .toEntities(fromCleanRow)
            .onError('transform').deadLetter()
            .onError('entity').deadLetter()
            .deadLetters().to.doc().db('datahub').collection('dead_letters')
            .lineage().to.doc().db('datahub').collection('lineage')
            .save({ batchSize: 500 });
    }
}

/** Accepted referrals become customers and appointments. It has no trigger of its own: the ReferralFlow runs it. */
@Register()
export class ReferralImportPipeline extends Pipeline {
    define() {
        return this.pipeline('referral-import')
            .on.manual()
            .toEntities(fromCleanRow) // referrals arrive in the clean shape, so they map like silver rows
            .onError('entity').deadLetter()
            .deadLetters().to.doc().db('datahub').collection('dead_letters')
            .lineage().to.doc().db('datahub').collection('lineage');
    }
}

/** The partner CRM publishes customer updates to the crm-customers queue: { fullName, phone }. */
@Register()
export class CrmCustomersPipeline extends Pipeline {
    define() {
        return this.pipeline('crm-customers')
            .on.mq().queue('crm-customers')
            .from.trigger().payload()
            .toEntity(Customers, { name: (customer) => customer.fullName }) // phone has the same name and is copied
            .onError('entity').deadLetter()
            .deadLetters().to.doc().db('datahub').collection('dead_letters')
            .lineage().to.doc().db('datahub').collection('lineage');
    }
}

/** A row of the partner practice's `patients` table. */
export type PatientRow = {
    id: number;
    first_name: string;
    last_name: string;
    mobile: string;
    active: boolean;
};

/** Every night, active patients of the partner practice become customers. On demand: POST /data/syncs/practice. */
@Register()
export class PracticeSyncPipeline extends Pipeline {
    define() {
        return this.pipeline('practice-sync')
            .on.timer('0 0 2 * * *') // every night at 02:00
            .on.http().post('/practice')
            .from.sql('practice').select<PatientRow>((sql) => sql.table<PatientRow>('patients').where({ active: true }))
            .toEntity(Customers, {
                name: (patient) => `${patient.first_name} ${patient.last_name}`,
                phone: (patient) => patient.mobile
            })
            .lineage().to.doc().db('datahub').collection('lineage');
    }
}
