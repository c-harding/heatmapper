import 'moment-timezone';

import express from 'express';
import ical from 'ical-generator';
import moment from 'moment-timezone';

import eagerIterator from './eager-iterator';
import { getSportIcon } from './sport-icons';
import { Strava } from './strava';

export default function calendarRouter(domain: string): express.Router {
  const router = express.Router();

  const mkRequestLogin = (res: express.Response) => async () => {
    res.status(403).send('Not logged in');
    return false;
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

  router.get('/:token.ics', async (req: express.Request, res: express.Response) => {
    async function requestLogin() {
      res.status(404).send();
    }

    const strava = new Strava(domain, req.params.token, requestLogin);

    res.type('text/calendar; charset=UTF-8');

    const cal = ical({ name: 'Strava Calendar' });

    for await (const activity of eagerIterator(strava.getStravaActivities())) {
      const startTime = moment(activity.start_date).tz(activity.timezone.split(' ')[1]);
      const location = activity.start_latlng.join(', ');

      const twoDigits = (val: number) => String(val.toFixed(0)).padStart(2, '0');

      const toHms = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 60 / 60),
          minutes = Math.floor(totalSeconds / 60) % 60,
          seconds = totalSeconds % 60;
        return (hours ? [hours, twoDigits(minutes), twoDigits(seconds)] : [minutes, twoDigits(seconds)]).join(':');
      };

      const descriptionFields = {
        Distance: activity.distance && `${(activity.distance / 1000).toFixed(2)} km`,
        'Elevation gain': activity.total_elevation_gain && `${activity.total_elevation_gain.toFixed(0)} m`,
        'Average speed':
          activity.average_speed &&
          activity.sport_type !== 'Run' &&
          `${(activity.average_speed * 3.6).toFixed(1)} km/h`,
        'Average pace':
          activity.average_speed && activity.sport_type === 'Run' && `${toHms(1000 / activity.average_speed)}/km`,
        'Average heart rate': activity.has_heartrate && `${activity.average_heartrate?.toFixed(0)} bpm`,
        'Max heart rate': activity.has_heartrate && `${activity.max_heartrate?.toFixed(0)} bpm`,
      };
      const descriptionData = Object.entries(descriptionFields)
        .filter(([, value]) => value)
        .map(([label, value]) => `${label}: ${value}`)
        .join('\n');

      cal.createEvent({
        summary: `${activity.name} ${getSportIcon(activity)}`,
        location: location,
        start: startTime,
        end: moment(startTime).add(activity.elapsed_time, 'seconds'),
        url: `https://strava.com/activities/${activity.id}`,
        description: descriptionData,
      });
    }

    res.send(cal.toString());
  });

  return router;
}
