import { Platform } from '@3flows/platform';
import './domain.js';
import './appointments.js';
import './exchange.js';
import './pipelines.js';
import './flows.js';
import './reception.js';
import { seedPractice } from './seed.js';

await Platform.run('./steps/26-workload-identity/appointments.yml');
await seedPractice();
