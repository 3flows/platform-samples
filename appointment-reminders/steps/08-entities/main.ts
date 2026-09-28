import { Platform } from '@3flows/platform';
import './domain.js';
import './appointments.js';
import './notifications.js';

await Platform.run('./steps/08-entities/platform.yml');
