import { Platform } from '@3flows/platform';
import './domain.js';
import './appointments.js';
import './notifications.js';

await Platform.run('./steps/09-domain/platform.yml');
