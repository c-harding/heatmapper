// Shows the app's Strava webhook subscription, or with --update moves it to the address the env file
// gives: WEBHOOK_RECEIVER/api/hook, or WEBHOOK_RECEIVER/api/hook/STRAVA_WEBHOOK_TOKEN when that is set.
// Run through scripts/webhook-subscription, which works out the env file.
//
// Strava allows one subscription per app and none can be edited, so moving it deletes the old one and
// creates the new one. That only happens once the new address answers Strava's verification, and the
// old one is put back if Strava refuses the new one. The verify token Strava's handshake carries is
// made up afresh each time and announced to the receiver, which answers no other handshake.
import { randomBytes } from 'crypto';
import { basename } from 'path';

import {
  STRAVA_BASE_URL,
  STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET,
  STRAVA_WEBHOOK_TOKEN,
  WEBHOOK_RECEIVER,
} from '../shared/config/dotenv.js';
import { sign, SIGNATURE_HEADER } from '../shared/webhook-signature.js';

interface Subscription {
  id: number;
  callback_url: string;
}

/** A request's reply, or with a status saying why there was none */
interface Reply {
  ok: boolean;
  status: number | string;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

const ENV_FILE = basename(process.env.DOTENV_FILE ?? '.env');

function die(message: string): never {
  console.error(message);
  process.exit(1);
}

let update = false;
for (const arg of process.argv.slice(2)) {
  if (arg === '--update') update = true;
  else die(`Unknown argument: ${arg}`);
}

if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) die(`${ENV_FILE} has no Strava credentials.`);
if (!WEBHOOK_RECEIVER) die(`${ENV_FILE} has no WEBHOOK_RECEIVER.`);
// The server goes by the origin alone, so the address is built from that, and nothing else is taken
const RECEIVER = URL.parse(WEBHOOK_RECEIVER);
if (
  !RECEIVER ||
  !['http:', 'https:'].includes(RECEIVER.protocol) ||
  RECEIVER.href !== `${RECEIVER.origin}/`
) {
  die(
    `WEBHOOK_RECEIVER in ${ENV_FILE} should be just the receiver's origin, like https://example.com.`,
  );
}

const SECRET = STRAVA_CLIENT_SECRET;
const API = `${STRAVA_BASE_URL}/api/v3/push_subscriptions`;
const CREDENTIALS = { client_id: STRAVA_CLIENT_ID, client_secret: SECRET };
const ADDRESS = `${RECEIVER.origin}/api/hook${STRAVA_WEBHOOK_TOKEN ? `/${STRAVA_WEBHOOK_TOKEN}` : ''}`;
const VERIFY_TOKEN = randomBytes(16).toString('hex');

/** Keeps tokens out of anything printed, the current one and any earlier one in Strava's reply */
function shown(text: string): string {
  const masked = STRAVA_WEBHOOK_TOKEN ? text.replaceAll(STRAVA_WEBHOOK_TOKEN, '<token>') : text;
  return masked.replace(/(\/api\/hook\/)[^/?" ]+/g, '$1<token>');
}

async function request(url: string, init: RequestInit = {}): Promise<Reply> {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(10_000), ...init });
  } catch (e) {
    const error = e as { cause?: { code?: string }; name?: string };
    return {
      ok: false,
      status: error.cause?.code ?? error.name ?? 'no reply',
      json: () => Promise.resolve(undefined),
      text: () => Promise.resolve(''),
    };
  }
}

/** Posts a body to one of the relay routes of the receiver behind an address, signed */
async function signedPost(address: string, route: string, body: object): Promise<number | string> {
  const path = `/api/hook/relay/${route}`;
  const text = JSON.stringify(body);
  const res = await request(`${new URL(address).origin}${path}`, {
    method: 'POST',
    body: text,
    headers: { 'Content-Type': 'application/json', [SIGNATURE_HEADER]: sign(path, text, SECRET) },
  });
  return res.status;
}

/** Tells the receiver which verify token Strava's handshake will carry */
async function announce(address: string): Promise<boolean> {
  return (await signedPost(address, 'verification', { verifyToken: VERIFY_TOKEN })) === 204;
}

/** Tells the receiver the subscription's new ID, which it otherwise only learns on restarting */
async function tellReceiver(address: string, id: number): Promise<void> {
  const status = await signedPost(address, 'subscription', { id });
  if (status !== 204) {
    console.error(
      `${shown(address)} did not take the subscription's new ID (${status}), so it ignores its events until it restarts.`,
    );
  }
}

/** Asks Strava for a subscription to an address, and gives its ID, or Strava's reply on refusing */
async function create(callbackUrl: string): Promise<{ id?: number; reply: string }> {
  const form = new FormData();
  const fields = { ...CREDENTIALS, callback_url: callbackUrl, verify_token: VERIFY_TOKEN };
  for (const [name, value] of Object.entries(fields)) form.append(name, value);
  const res = await request(API, { method: 'POST', body: form });
  const text = await res.text();
  let id: number | undefined;
  try {
    id = (JSON.parse(text) as { id?: number }).id;
  } catch {
    // Not JSON, so a refusal
  }
  return { id, reply: text || String(res.status) };
}

async function main(): Promise<void> {
  const list = await request(`${API}?${new URLSearchParams(CREDENTIALS)}`);
  if (!list.ok) die('Strava would not list the subscriptions.');
  const [current] = (await list.json()) as [Subscription?];

  console.log(
    current
      ? `Subscription ${current.id}: ${shown(current.callback_url)}`
      : 'There is no subscription.',
  );
  console.log(`Address from ${ENV_FILE}: ${shown(ADDRESS)}`);
  if (current?.callback_url === ADDRESS)
    return console.log('The subscription already points there.');
  if (!update) return console.log('Run again with --update to move it there.');

  // Strava verifies the address as it creates the subscription, so check first that it will pass
  if (!(await announce(ADDRESS))) {
    die(
      `${shown(ADDRESS)} does not take a verify token yet, so nothing was changed. Deploy it first.`,
    );
  }
  const challenge = randomBytes(8).toString('hex');
  const handshake = new URLSearchParams({
    'hub.mode': 'subscribe',
    'hub.verify_token': VERIFY_TOKEN,
    'hub.challenge': challenge,
  });
  const reply = (await (await request(`${ADDRESS}?${handshake}`)).json().catch(() => undefined)) as
    | { 'hub.challenge'?: unknown }
    | undefined;
  if (reply?.['hub.challenge'] !== challenge) {
    die(
      `${shown(ADDRESS)} does not answer Strava's verification yet, so nothing was changed. Deploy it first.`,
    );
  }

  if (current) {
    const res = await request(`${API}/${current.id}?${new URLSearchParams(CREDENTIALS)}`, {
      method: 'DELETE',
    });
    if (res.status !== 204) {
      die(
        `Strava would not delete subscription ${current.id} (${res.status}), so nothing was changed.`,
      );
    }
  }

  const created = await create(ADDRESS);
  if (created.id === undefined) {
    console.error(`Strava refused the new subscription: ${shown(created.reply)}`);
    if (current) {
      if (!(await announce(current.callback_url))) {
        console.error(`${shown(current.callback_url)} does not take a verify token.`);
      }
      const restored = await create(current.callback_url);
      if (restored.id === undefined) {
        console.error(
          `Could not put back the old one either, so there is no subscription: ${shown(restored.reply)}`,
        );
      } else {
        console.error(`Put back the old address, as subscription ${restored.id}.`);
        await tellReceiver(current.callback_url, restored.id);
      }
    }
    process.exit(1);
  }
  console.log(`Subscription ${created.id} now points at ${shown(ADDRESS)}.`);
  await tellReceiver(ADDRESS, created.id);
}

// Masked, as an error's message or stack can hold the address, token and all
main().catch((e: unknown) => die(shown(String(e instanceof Error ? e.stack : e))));
