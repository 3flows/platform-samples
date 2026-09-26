import { Platform } from '@3flows/platform';
import './services.js';

await Platform.run('./steps/01-book-appointment/platform.yml');
