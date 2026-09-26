import { Platform } from '@3flows/platform';
import './notifications.js';

const shutdown = async () => {
    await Platform.shutdown();
    process.exit(0);
};
process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());

await Platform.run('./steps/08-separate-processes/notifications.yml');
