import { Platform } from '@3flows/platform';
import './appointments.js';
import './notifications.js';

await Platform.run('./steps/07-notifications-service/platform.yml');
