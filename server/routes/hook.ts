import { type RequestHandler } from 'express';

import { Strava } from '../strava';
import { type WebhookRelay } from '../webhook-relay';

interface BaseUpdate {
  owner_id: number;
  subscription_id: number;
  event_time: number;
}

interface ActivityUpdate extends BaseUpdate {
  object_type: 'activity';
  object_id: number;
  aspect_type: 'create' | 'update' | 'delete';
  updates: Record<'title' | 'type' | 'private', string>;
}
interface AthleteUpdate extends BaseUpdate {
  object_type: 'athlete';
  object_id: number;
  updates: { authorized: 'false' };
}

type HookUpdate = ActivityUpdate | AthleteUpdate;

/**
 * Strava's end of the webhook, set up with yarn webhook-subscription. Anything that isn't Strava's,
 * whichever part is wrong, is passed on to the server's ordinary 404, as if the route didn't exist.
 */
export class HookHandler {
  constructor(
    readonly domain: string,
    private readonly relay: WebhookRelay,
  ) {}

  private atStravaAddress(req: Parameters<RequestHandler>[0]): boolean {
    return this.relay.isStravaAddress(req.params.token as string | undefined);
  }

  /** Strava's handshake on creating a subscription, answered only with the verify token just announced */
  readonly get: RequestHandler = (req, res, next) => {
    const challenge = req.query['hub.challenge'];
    // Every part checked whichever fails, so that the time taken doesn't show which
    const atAddress = this.atStravaAddress(req);
    const announced = this.relay.isAnnouncedVerifyToken(req.query['hub.verify_token']);
    if (atAddress && announced && req.query['hub.mode'] === 'subscribe' && typeof challenge === 'string') {
      res.send({ 'hub.challenge': challenge });
    } else {
      next();
    }
  };

  /** An event from Strava, taken only with both the secret address and this app's subscription ID */
  readonly post: RequestHandler = (req, res, next) => {
    const body = req.body as HookUpdate;
    const accepts = this.relay.isReceiver;
    const atAddress = this.atStravaAddress(req);
    const ours = this.relay.isOurSubscription(body?.subscription_id);
    if (!(accepts && atAddress && ours)) {
      // Logged only once the 404 has gone, so that it takes no longer than any other
      if (accepts && atAddress) {
        res.once('finish', () => {
          console.warn(`Ignored a webhook event for subscription ${body?.subscription_id}, which isn't this app's`);
        });
      }
      next();
      return;
    }
    // Strava allows two seconds for the reply, so the work happens after it
    res.status(204).send();
    void this.relay.passOn(body);
    this.handle(body);
  };

  /** An event Strava sent to the receiver, passed on to this deployment */
  readonly forwarded: RequestHandler = async (req, res) => {
    if (!this.relay.isSigned(req)) {
      res.status(403).send();
      return;
    }
    res.status(204).send();
    this.handle(req.body as HookUpdate);
  };

  private handle(body: HookUpdate) {
    if (body?.object_type === 'athlete' && body.updates?.authorized === 'false') {
      this.deauthorise(body.object_id).catch((e) => console.error('Could not handle a deauthorisation:', e));
    }
  }

  private async deauthorise(athlete: number) {
    if (!(await Strava.isDeauthorised(this.domain, athlete))) {
      console.warn(`Ignored a deauthorisation of athlete ${athlete} that Strava does not confirm`);
      return;
    }
    await new Strava(this.domain, undefined, null).logout(true, athlete);
  }
}
