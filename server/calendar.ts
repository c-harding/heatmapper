import { VITE_APP_NAME } from '@strava-heatmapper/shared/config/dotenv';
import { runningSportGroup } from '@strava-heatmapper/shared/interfaces/SportType';
import express from 'express';
import ical from 'ical-generator';

import LoginError from './login-error';
import { extractRequestToken } from './request-utils';
import { getSportIcon } from './sport-icons';
import { Strava } from './strava';
import { StravaError } from './strava/raw-api';

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const page = (body: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Calendar – ${escapeHtml(VITE_APP_NAME)}</title>
  </head>
  <body>
    <h1>Calendar</h1>
    ${body}
  </body>
</html>
`;

const twoDigits = (val: number) => String(val).padStart(2, '0');

const toHms = (exactSeconds: number) => {
  const totalSeconds = Math.round(exactSeconds);
  const hours = Math.floor(totalSeconds / 60 / 60),
    minutes = Math.floor(totalSeconds / 60) % 60,
    seconds = totalSeconds % 60;
  return (hours ? [hours, twoDigits(minutes), twoDigits(seconds)] : [minutes, twoDigits(seconds)]).join(':');
};

const runTypes = new Set(runningSportGroup.split(','));

export default function calendarRouter(domain: string): express.Router {
  const router = express.Router();
  const { hostname: host, origin } = new URL(domain);

  const mkRequestLogin = (res: express.Response) => async () => {
    res.status(403).send('Not logged in');
    return false;
  };

  /** The browser's own session, if it is signed in */
  const browserSession = async (req: express.Request) => {
    const strava = new Strava(domain, extractRequestToken(req), null);
    return (await strava.hasToken()) ? strava : undefined;
  };

  // Old cookies have no SameSite, so another site's form would still send them
  const sameOrigin: express.RequestHandler = (req, res, next) => {
    if (req.get('origin') === origin) next();
    else res.status(403).send('Forbidden');
  };

  router.get('/', async (req: express.Request, res: express.Response) => {
    const token = req.cookies.token;
    const requestLogin = mkRequestLogin(res);
    if (token && (await new Strava(domain, token, requestLogin).hasToken())) {
      const webcalDomain = domain.replace(/\w+(?=:\/\/)/, 'webcal');
      const pathWithSlash = req.originalUrl.replace(/\/?$/, '/');
      const fullPath = webcalDomain + pathWithSlash + token + '.ics';
      res.redirect(fullPath);
    } else {
      await requestLogin();
    }
  });

  router.post('/', sameOrigin, async (req: express.Request, res: express.Response) => {
    const strava = await browserSession(req);
    if (!strava) {
      res.status(403).send('Not signed in');
      return;
    }
    try {
      await strava.createCalendar();
    } catch (e) {
      if (e instanceof LoginError) {
        const app = `<a href="/">${escapeHtml(VITE_APP_NAME)}</a>`;
        res
          .status(403)
          .send(page(`<p>Strava no longer accepts this sign-in. Sign in to ${app} again, then come back here.</p>`));
      } else if (e instanceof StravaError) {
        res.status(503).send(page('<p>Strava could not be reached. Try again later.</p>'));
      } else throw e;
      return;
    }
    res.redirect(303, req.baseUrl);
  });

  router.post('/delete', sameOrigin, async (req: express.Request, res: express.Response) => {
    const strava = await browserSession(req);
    if (!strava) {
      res.status(403).send('Not signed in');
      return;
    }
    await strava.deleteCalendar();
    res.redirect(303, req.baseUrl);
  });

  router.get('/:token.ics', async (req: express.Request, res: express.Response) => {
    const strava = new Strava(domain, req.params.token, mkRequestLogin(res));

    const cal = ical({ name: 'Strava activities' });

    for await (const activity of strava.getStravaActivities()) {
      const startInstant = Temporal.Instant.from(activity.start_date);
      let startTime: Temporal.ZonedDateTime;
      let timezone: string | undefined;
      try {
        startTime = startInstant.toZonedDateTimeISO(activity.timezone.split(' ')[1]);
        timezone = startTime.timeZoneId;
      } catch {
        // A zone Node does not know: give the times in UTC, without a zone
        startTime = startInstant.toZonedDateTimeISO('UTC');
      }
      const location = activity.start_latlng?.length ? activity.start_latlng.join(', ') : undefined;

      const isRun = runTypes.has(activity.sport_type);

      const descriptionFields = {
        'Elapsed time': activity.elapsed_time && `${toHms(activity.elapsed_time)}`,
        'Moving time': activity.moving_time && `${toHms(activity.moving_time)}`,
        Distance: activity.distance && `${(activity.distance / 1000).toFixed(2)} km`,
        'Elevation gain': activity.total_elevation_gain && `${activity.total_elevation_gain.toFixed(0)} m`,
        'Average speed': activity.average_speed && !isRun && `${(activity.average_speed * 3.6).toFixed(1)} km/h`,
        'Average pace': activity.average_speed && isRun && `${toHms(1000 / activity.average_speed)}/km`,
        'Average heart rate': activity.average_heartrate && `${activity.average_heartrate.toFixed(0)} bpm`,
        'Max heart rate': activity.max_heartrate && `${activity.max_heartrate.toFixed(0)} bpm`,
      };
      const descriptionData = Object.entries(descriptionFields)
        .filter(([, value]) => value)
        .map(([label, value]) => `${label}: ${value}`)
        .join('\n');

      cal.createEvent({
        id: `${activity.id}@${host}`,
        summary: `${activity.name} ${getSportIcon(activity)}`,
        location: location,
        timezone,
        start: startTime,
        end: startTime.add({ seconds: activity.elapsed_time }),
        url: `https://strava.com/activities/${activity.id}`,
        description: descriptionData,
      });
    }

    res.attachment('calendar.ics');
    res.send(cal.toString());
  });

  return router;
}
