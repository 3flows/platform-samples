import { Platform } from '@3flows/platform';
import './domain.js';
import './appointments.js';
import './notifications.js';
import './exchange.js';
import './pipelines.js';
import { seedPractice } from './seed.js';

await Platform.run('./steps/14-sql-sync/platform.yml');
await seedPractice();
