import { Platform } from '@3flows/platform';
import './services.js';

await Platform.run('./steps/03-sms-confirmation/platform.yml');
