import { type RequestHandler } from 'express';

import { InvalidLogin } from '../login-error';
import { extractRequestToken, requestLogin } from '../request-utils';
import { Strava } from '../strava';

export class UserHandler {
  constructor(readonly domain: string) {}

  readonly get: RequestHandler = async (req, res) => {
    const stravaApi = new Strava(this.domain, extractRequestToken(req), requestLogin(res));
    try {
      const athlete = await stravaApi.getUserInfo();
      res.send(athlete);
    } catch (e) {
      // Not 403, which the client takes as a request to log in
      if (e instanceof InvalidLogin) {
        res.status(401).send({ type: 'Unauthorized', error: e.message });
        return;
      }
      if (e) console.error('Got error fetching the user info:', e);
      res.status(500).send({ type: 'Internal Server Error', error: e });
    }
  };

  readonly delete: RequestHandler = async (req, res) => {
    const global = 'global' in req.query;

    const stravaApi = new Strava(this.domain, extractRequestToken(req), null);
    try {
      await stravaApi.logout(global);
      res.status(204).send();
    } catch (e) {
      console.error('Got error logging out:', e);
      res.status(500).send({ type: 'Internal Server Error', error: e });
    }
  };
}
