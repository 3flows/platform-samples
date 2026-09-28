import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Platform } from '@3flows/platform';

describe('my-platform-app', () => {
    before(async () => {
        await Platform.run('./platform.yml');
    });

    after(async () => {
        await Platform.shutdown();
    });

    test('the platform is up and healthy', async () => {
        const response = await fetch('http://127.0.0.1:3000/health');
        assert.equal(response.status, 200);
    });

    test('it reports the name and version from platform.yml and package.json', async () => {
        const ping = await (await fetch('http://127.0.0.1:3000/ping')).json();
        assert.equal(ping.name, 'my-platform-app');
        assert.equal(ping.version, '0.1.0');
    });
});
