import { Platform, SQL, SQLs } from '@3flows/platform';
import type { PatientRow } from './pipelines.js';

/** The memory database of the partner practice starts empty. These patients make the sample runnable. */
export async function seedPractice(): Promise<void> {
    const sqls = Platform.get<SQLs>('sqls');
    const practice = Platform.get<SQL>(sqls.registry['practice']);

    await practice
        .table<PatientRow>('patients')
        .insert(
            { id: 1, first_name: 'Dorothy', last_name: 'Vaughan', mobile: '+15550000011', active: true },
            { id: 2, first_name: 'Mary', last_name: 'Jackson', mobile: '+15550000012', active: true },
            { id: 3, first_name: 'Annie', last_name: 'Easley', mobile: '+15550000013', active: false }
        )
        .run();
}
