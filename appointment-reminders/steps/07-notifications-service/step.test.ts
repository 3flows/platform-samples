import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Platform } from '@3flows/platform';
import { inHours, post, sentSms } from '../_shared/test-helpers.js';
import './appointments.js';
import './notifications.js';

describe('Step 07: a dedicated notifications service', () => {
    before(async () => {
        await Platform.run('./steps/07-notifications-service/platform.yml');
    });

    after(async () => {
        await Platform.shutdown();
    });

    test('booking calls the notifications service, which confirms by SMS', async () => {
        await post('http://127.0.0.1:3000/bookAppointment', { name: 'Ada', phone: '+15550000001', at: inHours(20) });

        const confirmations = sentSms('+15550000001').filter((m) => m.body.includes('is confirmed'));
        assert.equal(confirmations.length, 1);
    });

    test('reminders are sent through the notifications service exactly once', async () => {
        assert.equal((await post('http://127.0.0.1:3000/sendDueReminders')).sent, 1);
        assert.equal((await post('http://127.0.0.1:3000/sendDueReminders')).sent, 0);

        const reminders = sentSms('+15550000001').filter((m) => m.body.startsWith('Reminder'));
        assert.equal(reminders.length, 1);
    });
});
