import { STRAVA_BASE_URL } from '@strava-heatmapper/shared/config/dotenv';
import { sign, SIGNATURE_HEADER, verify } from '@strava-heatmapper/shared/webhook-signature';
import { createHash, timingSafeEqual } from 'crypto';
import { type RequestHandler } from 'express';
import { readFile } from 'fs/promises';
import fetch from 'node-fetch';

import { updateFile } from './strava/file';

/** How long a deployment stays signed up after it last checked in */
const PEER_LIFETIME = 60 * 60 * 1000;
const CHECK_IN_INTERVAL = 5 * 60 * 1000;
/** How often the receiver asks Strava for the subscription on starting, until Strava answers */
const SUBSCRIPTION_RETRY_INTERVAL = 60 * 1000;

type Peers = Record<string, { lastSeen: number }>;
interface Subscription {
  id: number;
}

/** Compares a secret in the same time whatever is given, however long */
function sameSecret(given: string, expected: string): boolean {
  const hash = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(given), hash(expected));
}

function originOf(setting: string, domain: string | undefined): string | undefined {
  if (!domain) return undefined;
  try {
    // "host:port" also parses, with the host as its scheme
    const url = new URL(domain);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.origin;
  } catch {
    // Reported below
  }
  console.warn(`${setting} is not an http(s) URL, so webhook events are not passed on: ${domain}`);
  return undefined;
}

/**
 * Strava allows one webhook subscription per app, but the app runs as several deployments. The one
 * named as the receiver gets Strava's events and passes them on to every other deployment that has
 * signed up with it; the others sign up on starting and every 5 minutes, and lapse an hour after
 * stopping.
 */
export class WebhookRelay {
  private readonly ownOrigin?: string;
  private readonly receiverOrigin?: string;
  private subscriptionId?: number;

  constructor(
    ownDomain: string,
    receiverDomain: string | undefined,
    private readonly clientId: string | undefined,
    private readonly secret: string | undefined,
    private readonly peersFile: string,
    /** When set, Strava's requests are taken only at /hook/<this>, an address only Strava knows */
    private readonly stravaToken?: string,
  ) {
    // A mistyped setting turns forwarding off rather than stopping the server
    this.ownOrigin = originOf('SERVER_DOMAIN', ownDomain);
    this.receiverOrigin = originOf('WEBHOOK_RECEIVER', receiverDomain);
  }

  get enabled(): boolean {
    return !!this.secret && !!this.ownOrigin && !!this.receiverOrigin;
  }

  /** Only the receiver hears from Strava; the others take only events it has checked and signed */
  get isReceiver(): boolean {
    return this.enabled && this.receiverOrigin === this.ownOrigin;
  }

  /** Whether a request came in at the address Strava was given, by the token in its path */
  isStravaAddress(given: string | undefined): boolean {
    if (!this.stravaToken) return given === undefined;
    return given !== undefined && sameSecret(given, this.stravaToken);
  }

  /**
   * Whether an event is for this app's subscription. The receiver asks Strava for its ID on starting;
   * no request makes it ask, so every wrong one is answered alike and costs Strava nothing.
   */
  isOurSubscription(id: unknown): boolean {
    return typeof id === 'number' && id === this.subscriptionId;
  }

  /** Learns the subscription's ID from Strava, asking every minute until it answers */
  private async lookUpSubscription(): Promise<void> {
    if (!this.clientId || !this.secret) return;
    let subscription: Subscription | undefined;
    let failure: string | undefined;
    try {
      const url = new URL(`${STRAVA_BASE_URL}/api/v3/push_subscriptions`);
      url.searchParams.set('client_id', this.clientId);
      url.searchParams.set('client_secret', this.secret);
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
      if (res.ok) [subscription] = (await res.json()) as Subscription[];
      else failure = `Strava replied ${res.status}`;
    } catch (e) {
      // Not the message, which can hold the request's URL, client secret and all
      failure = (e as { code?: string }).code ?? (e as Error).name;
    }
    if (failure) {
      console.warn(`Could not ask Strava for the webhook subscription: ${failure}`);
      setTimeout(() => void this.lookUpSubscription(), SUBSCRIPTION_RETRY_INTERVAL).unref();
      return;
    }
    this.subscriptionId = subscription?.id;
  }

  /** Whether a request carries this app's signature over its path and its body, as JSON.stringify writes it */
  isSigned(req: Parameters<RequestHandler>[0]): boolean {
    const body = JSON.stringify(req.body) as string | undefined;
    const path = req.originalUrl.split('?')[0];
    return !!this.secret && body !== undefined && verify(req.get(SIGNATURE_HEADER), path, body, this.secret);
  }

  /** The receiver's end of signing up: records the deployment that asked */
  readonly signUp: RequestHandler = async (req, res) => {
    if (!this.isReceiver || !this.isSigned(req)) {
      res.status(403).send();
      return;
    }
    let url: URL;
    try {
      url = new URL((req.body as { origin: string }).origin);
    } catch {
      res.status(400).send();
      return;
    }
    // Keeps a local server run with production settings from signing up its http://localhost
    if (url.protocol !== new URL(this.receiverOrigin!).protocol) {
      res.status(400).send();
      return;
    }
    const origin = url.origin;
    await updateFile<Peers>(this.peersFile, {}, (peers) => {
      peers[origin] = { lastSeen: Date.now() };
    });
    res.status(204).send();
  };

  /** Passes a Strava event on to every deployment signed up and not lapsed */
  async passOn(event: object): Promise<void> {
    try {
      await this.forward(JSON.stringify(event));
    } catch (e) {
      console.warn('Could not pass on a webhook event:', e);
    }
  }

  private async forward(body: string): Promise<void> {
    if (!this.isReceiver) return;
    const now = Date.now();
    let peers: Peers = {};
    try {
      peers = JSON.parse(await readFile(this.peersFile, 'utf-8'));
    } catch {
      return;
    }
    if (Object.values(peers).some(({ lastSeen }) => now - lastSeen > PEER_LIFETIME)) {
      peers = await updateFile<Peers>(this.peersFile, {}, (all) => {
        for (const [origin, { lastSeen }] of Object.entries(all)) {
          if (now - lastSeen > PEER_LIFETIME) delete all[origin];
        }
      });
    }

    await Promise.all(
      Object.keys(peers)
        .filter((origin) => origin !== this.ownOrigin)
        .map(async (origin) => {
          try {
            const res = await this.post(`${origin}/api/hook/relay/forwarded`, body);
            if (!res.ok) console.warn(`Passing a webhook event to ${origin} got ${res.status}`);
          } catch (e) {
            console.warn(`Could not pass a webhook event to ${origin}:`, e);
          }
        }),
    );
  }

  /** Signs this deployment up with the receiver now and every 5 minutes, unless it is the receiver */
  start(): void {
    if (this.isReceiver) void this.lookUpSubscription();
    if (!this.enabled || this.isReceiver) return;
    const checkIn = () =>
      this.checkIn().then(
        (res) => res.ok || console.warn(`Signing up for webhook events got ${res.status}`),
        (e) => console.warn('Could not sign up for webhook events:', e),
      );
    void checkIn();
    setInterval(checkIn, CHECK_IN_INTERVAL).unref();
  }

  /** Signs this deployment up with the receiver once */
  checkIn(): Promise<Awaited<ReturnType<typeof fetch>>> {
    return this.post(`${this.receiverOrigin}/api/hook/relay/peers`, JSON.stringify({ origin: this.ownOrigin }));
  }

  private post(url: string, body: string) {
    return fetch(url, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        [SIGNATURE_HEADER]: sign(new URL(url).pathname, body, this.secret!),
      },
      signal: AbortSignal.timeout(5000),
    });
  }
}
