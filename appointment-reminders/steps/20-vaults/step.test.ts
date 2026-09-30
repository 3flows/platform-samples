import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, afterEach, before, describe, test } from 'node:test';
import { Configuration, Platform } from '@3flows/platform';
import { inHours, post, sentSms } from '../_shared/test-helpers.js';
import './domain.js';
import './appointments.js';
import './notifications.js';
import './exchange.js';
import './pipelines.js';
import './flows.js';
import './reception.js';

const yml = readFileSync('./steps/20-vaults/platform.yml', 'utf8');
const secrets = ['dev-password', 'AC-dev-account', 'dev-auth-token'];

describe('Step 20: keep secrets in a vault', () => {
    before(async () => {
        await Platform.run('./steps/20-vaults/platform.yml');
    });

    after(async () => {
        await Platform.shutdown();
    });

    test('the code is identical to step 19; only YAML changed', () => {
        for (const file of ['appointments', 'domain', 'exchange', 'flows', 'legacy', 'model', 'notifications', 'pipelines', 'reception', 'seed']) {
            assert.equal(
                readFileSync(`steps/20-vaults/${file}.ts`, 'utf8'),
                readFileSync(`steps/19-admin/${file}.ts`, 'utf8'),
                `${file}.ts differs from step 19`
            );
        }
    });

    test('providers are started with the secrets from the vault', () => {
        const configuration = Configuration.current!;
        assert.equal(configuration.get('smss.0.parameters.accountSid').value(), 'AC-dev-account');
        assert.equal(configuration.get('smss.0.parameters.authToken').value(), 'dev-auth-token');
        assert.equal(
            configuration.get('sqls.0.parameters.connectionString').value(),
            'postgres://reader:dev-password@localhost:5432/practice'
        );
    });

    test('the admin API shows where secrets come from, never their values', async () => {
        const response = await fetch('http://127.0.0.1:3000/admin/api/configuration');
        const text = await response.text();
        for (const secret of secrets) {
            assert.doesNotMatch(text, new RegExp(secret), `${secret} is visible in the admin API`);
        }

        const configuration = JSON.parse(text);
        assert.equal(configuration.vaults[0].parameters.secrets, '[REDACTED]');
        assert.deepEqual(configuration.smss[0].parameters.accountSid, { $vault: { path: 'twilio', key: 'accountSid' } });
    });

    test('the app works as before', async () => {
        await post('http://127.0.0.1:3000/bookAppointment', { name: 'Ada', phone: '+15550000001', at: inHours(20) });
        assert.equal(sentSms('+15550000001').length, 1);
    });
});

describe('Step 20: a missing secret', () => {
    afterEach(async () => {
        await Platform.shutdown().catch(() => undefined);
    });

    test('stops the platform from starting', async () => {
        // The same YAML, but the vault has no twilio secret.
        const withoutTwilio = yml.replace(/^ {8}twilio:\n( {10}.*\n)+/m, '');
        assert.doesNotMatch(withoutTwilio, /dev-auth-token/);

        await assert.rejects(
            Platform.run({ load: async () => Configuration.parse(withoutTwilio) }),
            /Secret twilio is not defined/
        );
    });
});
