import { Platform } from '@3flows/platform';
import './domain.js';
import './appointments.js';
import './notifications.js';
import './exchange.js';

await Platform.run('./steps/12-transformers/platform.yml');
