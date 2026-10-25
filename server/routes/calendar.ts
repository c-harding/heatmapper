import { type RequestHandler } from 'express';
import { FetchError } from 'node-fetch';

import { InvalidLogin, NeedsLogin } from '../login-error';
import { extractRequestToken, requestLogin } from '../request-utils';
import { Strava } from '../strava';
import { StravaError } from '../strava/raw-api';

/** The app's own requests for its calendar link, answered in JSON */
export class CalendarHandler {
  constructor(readonly domain: string) {}

  /** The browser's own session, if it is signed in */
  private async browserSession(req: Parameters<RequestHandler>[0]): Promise<Strava | undefined> {
    const strava = new Strava(this.domain, extractRequestToken(req), null);
    return (await strava.hasToken()) ? strava : undefined;
  }

  /** Creates the link, or keeps the one there is, and gives its addresses */
  readonly post: RequestHandler = async (req, res) => {
    const strava = new Strava(this.domain, extractRequestToken(req), requestLogin(res));
    try {
      await strava.createCalendar();
      res.send(await strava.getCalendarUrls());
    } catch (e) {
      if (e instanceof NeedsLogin) {
        // No session, or one Strava no longer accepts: the login keeps its ID, and the app retries
        await strava.logIn();
      } else if (e instanceof InvalidLogin) {
        res.status(401).send({ type: 'Unauthorized', error: 'Not signed in' });
      } else if (e instanceof StravaError && e.status === 429) {
        res.status(503).send({ type: 'Service Unavailable', error: 'Strava is busy' });
      } else if (e instanceof StravaError) {
        res.status(502).send({ type: 'Bad Gateway', error: 'Strava answered with an error' });
      } else if (e instanceof FetchError) {
        res.status(502).send({ type: 'Bad Gateway', error: 'Strava could not be reached' });
      } else {
        console.error('Could not create a calendar:', e);
        res.status(500).send({ type: 'Internal Server Error' });
      }
    }
  };

  readonly delete: RequestHandler = async (req, res) => {
    const strava = await this.browserSession(req);
    if (!strava) {
      res.status(401).send({ type: 'Unauthorized', error: 'Not signed in' });
      return;
    }
    try {
      await strava.deleteCalendar();
      res.status(204).send();
    } catch (e) {
      console.error('Could not delete a calendar:', e);
      res.status(500).send({ type: 'Internal Server Error' });
    }
  };
}
