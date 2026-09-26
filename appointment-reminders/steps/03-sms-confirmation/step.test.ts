import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Platform } from '@3flows/platform';
import { inHours, post, sentSms } from '../_shared/test-helpers.js';
import './services.js';

describe('Step 03: confirm by SMS', () => {
    before(async () => {
        await Platform.run('./steps/03-sms-confirmation/platform.yml');
    });

    after(async () => {
        await Platform.shutdown();
    });

    test('booking sends a confirmation SMS', async () => {
        await post('http://127.0.0.1:3000/bookAppointment', {
            name: 'Ada',
            phone: '+15550000001',
            at: inHours(20)
        });

        const messages = sentSms('+15550000001');
        assert.equal(messages.length, 1);
        assert.match(messages[0].body, /is confirmed/);
    });
});
