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

/* Hook registered with:
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
    -F client_id=$STRAVA_CLIENT_ID \
    -F client_secret=$STRAVA_CLIENT_SECRET \
    -F callback_url=${WEBHOOK_RECEIVER}/api/hook \
    -F verify_token=1954fb70-c27a-4493-b846-2f3624187b78
*/

export class HookHandler {
  private readonly verifyToken = '1954fb70-c27a-4493-b846-2f3624187b78';

  constructor(
    readonly domain: string,
    private readonly relay: WebhookRelay,
  ) {}

  /** Strava's handshake on creating a subscription */
  readonly get: RequestHandler = (req, res) => {
    const challenge = req.query['hub.challenge'];
    const verified = req.query['hub.verify_token'] === this.verifyToken;
    if (verified && req.query['hub.mode'] === 'subscribe' && typeof challenge === 'string') {
      res.send({ 'hub.challenge': challenge });
    } else {
      res.status(400).send();
    }
  };

  /** An event from Strava, which only the receiver takes */
  readonly post: RequestHandler = (req, res, next) => {
    const body = req.body as HookUpdate;
    if (!this.relay.isReceiver) {
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
