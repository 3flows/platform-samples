import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Platform } from '@3flows/platform';
import { inHours, post, sentSms } from '../_shared/test-helpers.js';
import './services.js';

describe('Step 06: confirm asynchronously through a queue', () => {
    before(async () => {
        await Platform.run('./steps/06-async-with-queues/platform.yml');
    });

    after(async () => {
        await Platform.shutdown();
    });

    test('booking publishes an event and the queue route sends the confirmation', async () => {
        await post('http://127.0.0.1:3000/bookAppointment', { name: 'Ada', phone: '+15550000001', at: inHours(20) });

        const confirmations = sentSms('+15550000001').filter((m) => m.body.includes('is confirmed'));
        assert.equal(confirmations.length, 1);
    });

    test('reminders still go out exactly once', async () => {
        assert.equal((await post('http://127.0.0.1:3000/sendDueReminders')).sent, 1);
        assert.equal((await post('http://127.0.0.1:3000/sendDueReminders')).sent, 0);
    });
});
