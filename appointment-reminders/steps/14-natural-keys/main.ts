import { Platform } from '@3flows/platform';
import './domain.js';
import './appointments.js';
import './notifications.js';

await Platform.run('./steps/14-natural-keys/platform.yml');
