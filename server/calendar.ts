import express from 'express';
import ical from 'ical-generator';

import eagerIterator from './eager-iterator';
import LoginError from './login-error';
import { getSportIcon } from './sport-icons';
import { Strava } from './strava';
import { type SummaryActivity } from './strava/model';
import { SessionType } from './strava/raw-api';

export default function calendarRouter(domain: string): express.Router {
  const router = express.Router();
  const host = new URL(domain).hostname;

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
    const strava = new Strava(domain, req.params.token, null, undefined, SessionType.CALENDAR);

    const activities: SummaryActivity[] = [];
    try {
      for await (const activity of eagerIterator(strava.getStravaActivities())) activities.push(activity);
    } catch (e) {
      if (e instanceof LoginError) {
        res.status(404).send('No such calendar');
      } else {
        console.error('Could not fetch the activities for a calendar:', e);
        res.status(503).send('Strava could not be reached');
      }
      return;
    }

    const cal = ical({ name: 'Strava activities' });

    for (const activity of activities) {
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

      const twoDigits = (val: number) => String(val).padStart(2, '0');

      const toHms = (exactSeconds: number) => {
        const totalSeconds = Math.round(exactSeconds);
        const hours = Math.floor(totalSeconds / 60 / 60),
          minutes = Math.floor(totalSeconds / 60) % 60,
          seconds = totalSeconds % 60;
        return (hours ? [hours, twoDigits(minutes), twoDigits(seconds)] : [minutes, twoDigits(seconds)]).join(':');
      };

      const isRun = ['Run', 'TrailRun', 'VirtualRun'].includes(activity.sport_type);

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
