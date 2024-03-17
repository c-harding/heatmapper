import { type RequestHandler } from 'express';

import { extractRequestToken } from '../request-utils';
import { Strava } from '../strava';

export class UserHandler {
  constructor(readonly domain: string) {}

  readonly get: RequestHandler = async (req, res) => {
    async function requestLogin(token: string, url: string) {
      res.status(403).header('location', url).send({ token });
      return false;
    }

    const stravaApi = new Strava(this.domain, extractRequestToken(req), requestLogin);
    try {
      const athlete = await stravaApi.getUserInfo();
      res.send(athlete);
    } catch (e) {
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
