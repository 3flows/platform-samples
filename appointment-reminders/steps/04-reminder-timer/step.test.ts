import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Platform } from '@3flows/platform';
import { inHours, post, sentSms } from '../_shared/test-helpers.js';
import './services.js';

describe('Step 04: send reminders with a timer', () => {
    before(async () => {
        await Platform.run('./steps/04-reminder-timer/platform.yml');
    });

    after(async () => {
        await Platform.shutdown();
    });

    test('reminds appointments in the next 24 hours', async () => {
        await post('http://127.0.0.1:3000/bookAppointment', { name: 'Ada', phone: '+15550000001', at: inHours(20) });
        await post('http://127.0.0.1:3000/bookAppointment', { name: 'Bob', phone: '+15550000002', at: inHours(72) });

        const run = await post('http://127.0.0.1:3000/sendDueReminders');
        assert.equal(run.sent, 1);
        assert.equal(sentSms('+15550000001').filter((m) => m.body.startsWith('Reminder')).length, 1);
        assert.equal(sentSms('+15550000002').filter((m) => m.body.startsWith('Reminder')).length, 0);
    });

    test('the problem: every run reminds the same customer again', async () => {
        await post('http://127.0.0.1:3000/sendDueReminders');
        const reminders = sentSms('+15550000001').filter((m) => m.body.startsWith('Reminder'));
        assert.ok(reminders.length >= 2);
    });
});
