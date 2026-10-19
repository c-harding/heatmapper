import { VITE_APP_NAME } from '@strava-heatmapper/shared/config/dotenv';
import { runningSportGroup } from '@strava-heatmapper/shared/interfaces/SportType';
import express from 'express';
import ical from 'ical-generator';

import LoginError from './login-error';
import { extractRequestToken } from './request-utils';
import { getSportIcon } from './sport-icons';
import { Strava } from './strava';
import { type SummaryActivity } from './strava/model';
import { SessionType, StravaError } from './strava/raw-api';

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

/** An activity's time zone, if Node knows it; Strava gives e.g. "(GMT+01:00) Europe/Berlin" */
function activityZone(activity: SummaryActivity): string | undefined {
  const zone = activity.timezone.split(' ')[1];
  try {
    return Temporal.Instant.from(activity.start_date).toZonedDateTimeISO(zone).timeZoneId;
  } catch {
    return undefined;
  }
}

const icalDateTime = (time: Temporal.ZonedDateTime) =>
  time.toPlainDateTime().toString({ smallestUnit: 'second' }).replace(/[-:]/g, '');
const icalOffset = (offset: string) => offset.replace(':', '');

/**
 * A VTIMEZONE for a zone from Node's own time zone data, which RFC 5545 needs for every TZID used:
 * one observance per change of offset between `from` and `to`, given by date rather than rule.
 */
function vtimezone(zone: string, from: Temporal.Instant, to: Temporal.Instant): string | null {
  let time: Temporal.ZonedDateTime;
  try {
    time = from.toZonedDateTimeISO(zone);
  } catch {
    return null;
  }
  const observance = (start: Temporal.ZonedDateTime, offsetFrom: string) => {
    // Daylight saving is whichever offset is above the lower one of that year
    const offsetIn = (month: number) =>
      Temporal.PlainDateTime.from({ year: start.year, month, day: 1 }).toZonedDateTime(zone).offsetNanoseconds;
    const kind = start.offsetNanoseconds > Math.min(offsetIn(1), offsetIn(7)) ? 'DAYLIGHT' : 'STANDARD';
    // An observance starts at the local time it replaces
    const localStart = start.toInstant().toZonedDateTimeISO(offsetFrom);
    return [
      `BEGIN:${kind}`,
      `DTSTART:${icalDateTime(localStart)}`,
      `TZOFFSETFROM:${icalOffset(offsetFrom)}`,
      `TZOFFSETTO:${icalOffset(start.offset)}`,
      `END:${kind}`,
    ];
  };

  const lines = ['BEGIN:VTIMEZONE', `TZID:${zone}`, ...observance(time, time.offset)];
  for (let next = time.getTimeZoneTransition('next'); next && Temporal.Instant.compare(next.toInstant(), to) <= 0; ) {
    lines.push(...observance(next, next.subtract({ nanoseconds: 1 }).offset));
    next = next.getTimeZoneTransition('next');
  }
  lines.push('END:VTIMEZONE');
  return lines.join('\r\n');
}

export default function calendarRouter(domain: string): express.Router {
  const router = express.Router();
  const { hostname: host, origin } = new URL(domain);

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
    const strava = await browserSession(req);
    if (!strava) {
      res.send(page(`<p>Sign in to <a href="/">${escapeHtml(VITE_APP_NAME)}</a> first, then come back here.</p>`));
      return;
    }
    const urls = await strava.getCalendarUrls();
    if (!urls) {
      res.send(
        page(`
          <p>A calendar link lets a calendar app show your activities.</p>
          <form method="post" action="${req.baseUrl}"><button>Create calendar link</button></form>`),
      );
      return;
    }
    const confirmDelete = 'Delete this calendar link? Calendars subscribed to it will stop updating.';
    res.send(
      page(`
        <p>Subscribe in a calendar app: <a href="${escapeHtml(urls.webcal)}">${escapeHtml(urls.webcal)}</a></p>
        <p>Or add it by address: <code>${escapeHtml(urls.https)}</code></p>
        <form method="post" action="${req.baseUrl}/delete" onsubmit="return confirm('${confirmDelete}')">
          <button>Delete calendar link</button>
        </form>`),
    );
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
    // Stops paging through Strava once the calendar app has gone
    const abortController = new AbortController();
    res.on('close', () => abortController.abort());
    const strava = new Strava(domain, req.params.token, null, abortController.signal, SessionType.CALENDAR);

    const activities: SummaryActivity[] = [];
    try {
      for await (const activity of strava.getStravaActivities()) activities.push(activity);
    } catch (e) {
      if (abortController.signal.aborted) return;
      if (e instanceof LoginError) {
        res.status(404).send('No such calendar');
      } else {
        console.error('Could not fetch the activities for a calendar:', e);
        res.status(503).send('Strava could not be reached');
      }
      return;
    }
    if (abortController.signal.aborted) return;

    const cal = ical({ name: 'Strava activities' });
    const newestFirst = activities.toSorted((a, b) => b.start_date.localeCompare(a.start_date));
    if (newestFirst.length) {
      const from = Temporal.Instant.from(newestFirst.at(-1)!.start_date);
      // A day past the newest start covers its end
      const to = Temporal.Instant.from(newestFirst[0].start_date).add({ hours: 24 });
      // A name here would also apply to DTSTAMP and zoneless events, which must stay in UTC
      cal.timezone({ name: null, generator: (zone) => vtimezone(zone, from, to) });
      // The calendar takes the zone of the most recent activity
      const recentZone = newestFirst.map(activityZone).find((zone) => zone);
      if (recentZone) cal.x('X-WR-TIMEZONE', recentZone);
    }

    for (const activity of activities) {
      const timezone = activityZone(activity);
      // A zone Node does not know: the times are given in UTC
      const startTime = Temporal.Instant.from(activity.start_date).toZonedDateTimeISO(timezone ?? 'UTC');
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
