import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Platform } from '@3flows/platform';
import { inHours, post, sentSms } from '../_shared/test-helpers.js';
import './services.js';

describe('Step 05: remember sent reminders in a KV store', () => {
    before(async () => {
        await Platform.run('./steps/05-remember-reminders/platform.yml');
    });

    after(async () => {
        await Platform.shutdown();
    });

    test('each appointment is reminded exactly once', async () => {
        await post('http://127.0.0.1:3000/bookAppointment', { name: 'Ada', phone: '+15550000001', at: inHours(20) });

        assert.equal((await post('http://127.0.0.1:3000/sendDueReminders')).sent, 1);
        assert.equal((await post('http://127.0.0.1:3000/sendDueReminders')).sent, 0);
        assert.equal((await post('http://127.0.0.1:3000/sendDueReminders')).sent, 0);

        const reminders = sentSms('+15550000001').filter((m) => m.body.startsWith('Reminder'));
        assert.equal(reminders.length, 1);
    });
});
