import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Platform } from '@3flows/platform';
import { post } from '../_shared/test-helpers.js';
import './services.js';

describe('Step 00: hello world', () => {
    before(async () => {
        await Platform.run('./steps/00-hello-world/platform.yml');
    });

    after(async () => {
        await Platform.shutdown();
    });

    test('says hello over HTTP', async () => {
        const response = await post('http://127.0.0.1:3000/hello', { name: 'Ada' });
        assert.deepEqual(response, { message: 'Hello Ada, welcome to appointment reminders!' });
    });
});
