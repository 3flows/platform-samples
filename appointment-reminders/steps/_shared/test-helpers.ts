import { Platform, SMSMessage, SMSs } from '@3flows/platform';

/** POST JSON to a platform HTTP endpoint and return the parsed JSON response. */
export async function post<T = any>(url: string, body: unknown = {}): Promise<T> {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        throw new Error(`POST ${url} failed with ${response.status}: ${await response.text()}`);
    }
    return (await response.json()) as T;
}

/** Messages delivered to a phone number by the in-memory SMS provider of this process. */
export function sentSms(phone: string): SMSMessage[] {
    const smss = Platform.get<SMSs>('smss');
    const sms = Platform.get<{ mailbox(address: string): { messages: SMSMessage[] } }>(smss.registry['DEFAULT']);
    return sms.mailbox(phone).messages;
}

/** An ISO timestamp `hours` from now. */
export function inHours(hours: number): string {
    return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export async function waitForHttp(url: string, timeoutMs = 10000): Promise<void> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        try {
            const response = await fetch(url);
            if (response.ok) return;
        } catch {
            // not ready yet
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Timed out waiting for ${url}`);
}

let slackEvents = 0;

/**
 * Plays Slack: a reaction in the reception channel, delivered through the memory connector's `inject` handler.
 * The connector's server runs on port 3002 in the steps that use Slack.
 */
export function slackReaction(ts: string, reaction: string, user: string, id = `Ev${++slackEvents}`) {
    return post<{ ok: boolean; delivered: number }>('http://127.0.0.1:3002/inject', {
        id,
        type: 'reaction.added',
        payload: { type: 'reaction_added', user, reaction, item: { type: 'message', channel: 'C0RECEPTION', ts } }
    });
}

/** Messages the memory Slack connector has posted. */
export async function slackMessages(): Promise<Array<{ channel: string; text: string }>> {
    return (await post('http://127.0.0.1:3002/outbox')).messages;
}
