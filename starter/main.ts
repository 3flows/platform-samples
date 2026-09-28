import { Platform } from '@3flows/platform';

// Import your services here, before the platform starts, so that YAML can find them.

await Platform.run('./platform.yml');
