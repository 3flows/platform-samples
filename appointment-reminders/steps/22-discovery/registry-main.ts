import { Platform } from '@3flows/platform';

const shutdown = async () => {
    await Platform.shutdown();
    process.exit(0);
};
process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());

await Platform.run('./steps/22-discovery/registry.yml');
