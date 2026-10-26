import {
  MOCK_DELAY_MS,
  MOCK_PAGE_DELAY_MS,
  SERVER_DOMAIN,
  VITE_APP_FAVICON,
  VITE_APP_NAME,
} from '@strava-heatmapper/shared/config/dotenv';
import { randomBytes } from 'crypto';
import express, { type Request, type RequestHandler, type Response } from 'express';
import { STATUS_CODES } from 'http';

import { allActivities, allGear, allRoutes, ATHLETE } from './data';

/** What each scope lets the app do, worded as on Strava's consent form */
const SCOPES: Record<string, string> = {
  read: 'View data about your public profile (required)',
  read_all: 'View your private non-activity data such as segments and routes',
  'activity:read': 'View data about your activities',
  'activity:read_all': 'View data about your private activities',
};

const MOCK_TOKEN_LIFETIME = 6 * 60 * 60;

/** Query parameters holding a session token or a login, kept out of the log */
const SECRETS = new Set(['state', 'code']);

const loggable = (query: Request['query']) =>
  Object.fromEntries(Object.entries(query).filter(([name]) => !SECRETS.has(name)));

/** Only the app itself may be sent a login, as anywhere else would be handed a working code */
function appRedirect(uri: unknown): URL | undefined {
  try {
    const url = new URL(String(uri));
    return url.origin === new URL(SERVER_DOMAIN).origin ? url : undefined;
  } catch {
    return undefined;
  }
}

/** How many requests the log keeps */
const MOCK_LOG_LENGTH = 1000;

interface LoggedRequest {
  time: string;
  method: string;
  path: string;
  query: Request['query'];
}

/**
 * Codes and tokens carry their scopes, so that they survive a restart of the server, as the
 * sessions holding them do
 */
function issue(kind: 'code' | 'access' | 'refresh', scopes: string[], expiresAt = 0): string {
  const encoded = Buffer.from(scopes.join(',')).toString('base64url');
  return `mock-${kind}-${encoded}-${expiresAt}-${randomBytes(8).toString('hex')}`;
}

/** The scopes a code or token carries, and when it expires (0 for never), if it is one of ours */
function decode(kind: 'code' | 'access' | 'refresh', token: string | undefined) {
  const match = token?.match(new RegExp(`^mock-${kind}-([\\w-]*)-(\\d+)-[0-9a-f]+$`));
  if (!match) return undefined;
  return {
    scopes: Buffer.from(match[1], 'base64url').toString().split(',').filter(Boolean),
    expiresAt: Number(match[2]),
  };
}

const scopesOf = (kind: 'code' | 'access' | 'refresh', token: string | undefined) => decode(kind, token)?.scopes;

const escape = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Answer after a delay, as Strava takes its time */
const delayed =
  (ms: number, handler: (req: Request, res: Response) => void): RequestHandler =>
  async (req, res) => {
    await sleep(ms);
    handler(req, res);
  };

function page<T>(items: T[], query: Request['query']): T[] {
  const perPage = Math.min(Number(query.per_page) || 30, 200);
  const pageNumber = Math.max(Number(query.page) || 1, 1);
  return items.slice((pageNumber - 1) * perPage, pageNumber * perPage);
}

function consentForm(query: Request['query']): string {
  const requested = String(query.scope ?? 'read')
    .split(',')
    .filter((scope) => scope in SCOPES);
  const scopes = ['read', ...requested.filter((scope) => scope !== 'read')];
  const hidden = ['redirect_uri', 'state']
    .map((name) => `<input type="hidden" name="${name}" value="${escape(String(query[name] ?? ''))}">`)
    .join('');
  const checkboxes = scopes
    .map(
      (scope) =>
        `<label><input type="checkbox" name="scope" value="${scope}" checked${scope === 'read' ? ' disabled' : ''}>` +
        ` <span>${escape(SCOPES[scope])} <code>${scope}</code></span></label>`,
    )
    .join('');
  const icon = `<img src="${escape(SERVER_DOMAIN + VITE_APP_FAVICON)}" alt="" onerror="this.remove()">`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mock-Strava: authorize ${escape(VITE_APP_NAME)}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 26rem; margin: 2rem auto; padding: 0 1rem; color: #242428; }
  header { text-align: center; }
  header img { width: 5rem; height: 5rem; border-radius: 0.5rem; }
  h1 { font-size: 1.5rem; }
  a { color: #3274b3; }
  hr { border: none; border-top: 1px solid #ddd; margin: 1.5rem 0; }
  label { display: flex; gap: 0.75rem; align-items: baseline; margin: 0.75rem 0; }
  code { font-size: 0.8em; color: #6d6d78; }
  button { display: block; width: 100%; padding: 0.9rem; margin-top: 0.75rem; border-radius: 2rem; font: inherit; font-weight: 600; cursor: pointer; }
  .authorize { background: #fc5200; color: white; border: none; }
  .cancel { background: white; border: 1px solid #ccc; }
</style>
</head>
<body>
<header>
  ${icon}
  <h1>Authorize ${escape(VITE_APP_NAME)} to connect to Mock-Strava</h1>
  <p><a href="${escape(SERVER_DOMAIN)}">${escape(SERVER_DOMAIN)}</a></p>
  <p><small>This is a mock of Strava, served by the backend.</small></p>
</header>
<hr>
<form method="post">
  ${hidden}
  <p><strong>${escape(VITE_APP_NAME)} will be able to:</strong></p>
  ${checkboxes}
  <button class="authorize" name="decision" value="authorize">Authorize</button>
  <button class="cancel" name="decision" value="cancel">Cancel</button>
</form>
</body>
</html>`;
}

const AVATAR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 124 124">
<rect width="124" height="124" fill="#fc5200"/>
<text x="62" y="80" font-family="sans-serif" font-size="56" text-anchor="middle" fill="white">MA</text>
</svg>`;

const unauthorized = (res: Response, field: string, code: string) =>
  res.status(401).json({ message: 'Authorization Error', errors: [{ resource: 'AccessToken', field, code }] });

/** A mock of the parts of the Strava API that the backend uses, under Strava's own paths */
export default function mockStravaRouter(): express.Router {
  const router = express.Router();
  const log: LoggedRequest[] = [];

  router.use((req, _res, next) => {
    if (req.path !== '/_log') {
      const logged = loggable(req.query);
      log.push({ time: new Date().toISOString(), method: req.method, path: req.path, query: logged });
      if (log.length > MOCK_LOG_LENGTH) log.splice(0, log.length - MOCK_LOG_LENGTH);
      const query = new URLSearchParams(logged as Record<string, string>).toString();
      console.log('Mock Strava:', req.method, req.path, query);
    }
    next();
  });

  router.get('/_log', (_req, res) => {
    res.json(log);
  });

  /**
   * Failures tests asked for, each for a token of the session it set them up for, so that tests
   * running alongside are unaffected, and optionally only on some paths. The first that matches a
   * request is used, so several for one token play out in the order they were asked for.
   */
  const failures: { token: string; paths?: string[]; status: number | 'drop'; times: number }[] = [];

  /** A path or paths, as given in a request to /_fail */
  const pathsOf = (path: unknown) =>
    typeof path === 'string'
      ? [path]
      : Array.isArray(path) && path.every((p) => typeof p === 'string')
        ? path
        : undefined;

  router.post('/_fail', (req, res) => {
    const { token, path, status, times = 1 } = req.body as Record<string, unknown>;
    const paths = pathsOf(path);
    const valid =
      typeof token === 'string' &&
      (path === undefined || paths) &&
      (status === 'drop' || Number.isInteger(status)) &&
      Number.isInteger(times);
    if (!valid) {
      res.status(400).send('Send a token, optionally a path or paths, a status (or "drop") and how many times');
      return;
    }
    failures.push({ token, paths, status: status as number | 'drop', times: times as number });
    res.status(204).send();
  });

  // Every failure for the token given, and naming one of the paths given; all of them without either
  router.delete('/_fail', (req, res) => {
    const { token, path } = (req.body ?? {}) as Record<string, unknown>;
    const paths = pathsOf(path);
    if ((token !== undefined && typeof token !== 'string') || (path !== undefined && !paths)) {
      res.status(400).send('Send a token, a path or paths, or neither');
      return;
    }
    const removed = (failure: (typeof failures)[number]) =>
      (token === undefined || failure.token === token) &&
      (!paths || failure.paths?.some((failing) => paths.includes(failing)) === true);
    failures.splice(0, failures.length, ...failures.filter((failure) => !removed(failure)));
    res.status(204).send();
  });

  // A refresh sends its refresh token, and every other request its access token
  router.use((req, res, next) => {
    const body = req.body as { refresh_token?: unknown } | undefined;
    const token =
      req.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1] ??
      (typeof body?.refresh_token === 'string' ? body.refresh_token : undefined);
    const index = failures.findIndex(
      (failure) => failure.token === token && (!failure.paths || failure.paths.includes(req.path)),
    );
    if (index === -1) {
      next();
      return;
    }
    const failure = failures[index];
    if (--failure.times <= 0) failures.splice(index, 1);
    // Unanswered, as when Strava can't be reached
    if (failure.status === 'drop') req.socket.destroy();
    else res.status(failure.status).json({ message: STATUS_CODES[failure.status] ?? 'Error', errors: [] });
  });

  router.get('/avatar.svg', (_req, res) => {
    res.type('svg').send(AVATAR);
  });

  router.get(
    '/oauth/authorize',
    delayed(MOCK_DELAY_MS, (req, res) => {
      if (!appRedirect(req.query.redirect_uri)) {
        res.status(400).send('redirect_uri must be on SERVER_DOMAIN');
        return;
      }
      res.type('html').send(consentForm(req.query));
    }),
  );

  router.post(
    '/oauth/authorize',
    express.urlencoded({ extended: false }),
    delayed(MOCK_DELAY_MS, (req, res) => {
      const { redirect_uri: redirectUri, state, decision } = req.body as Record<string, string>;
      const target = appRedirect(redirectUri);
      if (!target) {
        res.status(400).send('redirect_uri must be on SERVER_DOMAIN');
        return;
      }
      target.searchParams.set('state', state);
      if (decision === 'authorize') {
        const ticked = ([] as string[]).concat((req.body as { scope?: string | string[] }).scope ?? []);
        const scopes = ['read', ...ticked.filter((scope) => scope in SCOPES && scope !== 'read')];
        target.searchParams.set('code', issue('code', scopes));
        target.searchParams.set('scope', scopes.join(','));
      } else {
        target.searchParams.set('error', 'access_denied');
      }
      res.redirect(target.toString());
    }),
  );

  router.post(
    '/oauth/token',
    delayed(MOCK_DELAY_MS, (req, res) => {
      const body = req.body as Record<string, string>;
      const scopes =
        body.grant_type === 'authorization_code'
          ? scopesOf('code', body.code)
          : scopesOf('refresh', body.refresh_token);
      if (!scopes) {
        res.status(400).json({
          message: 'Bad Request',
          errors: [{ resource: 'RefreshToken', field: body.code ? 'code' : 'refresh_token', code: 'invalid' }],
        });
        return;
      }
      // On the real clock, as the server checks expiry against it too
      const expiresAt = Math.floor(Date.now() / 1000) + MOCK_TOKEN_LIFETIME;
      res.json({
        token_type: 'Bearer',
        access_token: issue('access', scopes, expiresAt),
        // Strava keeps the scopes of the original login on a refresh
        refresh_token: body.refresh_token ?? issue('refresh', scopes),
        expires_at: expiresAt,
        expires_in: MOCK_TOKEN_LIFETIME,
        ...(body.grant_type === 'authorization_code' ? { athlete: ATHLETE } : {}),
      });
    }),
  );

  const api = express.Router();
  router.use('/api/v3', api);

  api.use((req, res, next) => {
    const access = decode('access', req.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1]);
    const expired = !!access?.expiresAt && access.expiresAt < Date.now() / 1000;
    if (!access || expired) {
      void sleep(MOCK_DELAY_MS).then(() =>
        res.status(401).json({
          message: 'Authorization Error',
          errors: [{ resource: 'Athlete', field: 'access_token', code: 'invalid' }],
        }),
      );
      return;
    }
    res.locals.scopes = access.scopes;
    next();
  });

  api.get(
    '/athlete',
    delayed(MOCK_DELAY_MS, (_req, res) => {
      res.json(ATHLETE);
    }),
  );

  api.get(
    '/athlete/activities',
    delayed(MOCK_PAGE_DELAY_MS, (req, res) => {
      const scopes: string[] = res.locals.scopes;
      const readAll = scopes.includes('activity:read_all');
      if (!readAll && !scopes.includes('activity:read')) {
        unauthorized(res, 'activity:read_permission', 'missing');
        return;
      }
      const before = Number(req.query.before) || Infinity;
      const after = Number(req.query.after) || -Infinity;
      const activities = allActivities().filter((activity) => {
        const start = Date.parse(activity.start_date) / 1000;
        return (readAll || !activity.private) && start > after && start < before;
      });
      // As Strava does: oldest first when only an after is given, otherwise newest first
      const ascending = req.query.after !== undefined && req.query.before === undefined;
      res.json(page(ascending ? activities.toReversed() : activities, req.query));
    }),
  );

  api.get(
    '/athletes/:id/routes',
    delayed(MOCK_PAGE_DELAY_MS, (req, res) => {
      const scopes: string[] = res.locals.scopes;
      const routes = Number(req.params.id) === ATHLETE.id ? allRoutes() : [];
      res.json(page(scopes.includes('read_all') ? routes : routes.filter((route) => !route.private), req.query));
    }),
  );

  api.get(
    '/gear/:id',
    delayed(MOCK_DELAY_MS, (req, res) => {
      const gear = allGear().find(({ id }) => id === req.params.id);
      if (gear) res.json(gear);
      else
        res
          .status(404)
          .json({ message: 'Record Not Found', errors: [{ resource: 'Gear', field: 'id', code: 'invalid' }] });
    }),
  );

  return router;
}
