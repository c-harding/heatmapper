import { type RequestHandler } from 'express';

import { Strava } from '../strava';

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
    -F callback_url=${SERVER_DOMAIN}/api/hook \
    -F verify_token=1954fb70-c27a-4493-b846-2f3624187b78
*/

export class HookHandler {
  private readonly verifyToken = '1954fb70-c27a-4493-b846-2f3624187b78';

  constructor(readonly domain: string) {}

  readonly get: RequestHandler = async (req, res) => {
    const mode = req.query['hub.mode'];
    const verifyToken = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && verifyToken == this.verifyToken && typeof challenge === 'string') {
      res.send({ 'hub.challenge': challenge });
    } else {
      res.status(400).send();
    }
  };

  readonly post: RequestHandler = async (req, res) => {
    const body = req.body as HookUpdate;
    // Strava allows two seconds for the reply, so the work happens after it
    res.status(204).send();

    if (body.object_type === 'athlete' && body.updates.authorized === 'false') {
      this.deauthorise(body.object_id).catch((e) => console.error('Could not handle a deauthorisation:', e));
    }
  };

  private async deauthorise(athlete: number) {
    if (!(await Strava.isDeauthorised(this.domain, athlete))) {
      console.warn(`Ignored a deauthorisation of athlete ${athlete} that Strava does not confirm`);
      return;
    }
    await new Strava(this.domain, undefined, null).logout(true, athlete);
  }
}
