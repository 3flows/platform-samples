import { Platform } from '@3flows/platform';
import './domain.js';
import './appointments.js';
import './notifications.js';
import './exchange.js';

await Platform.run('./steps/15-transformers/platform.yml');
