const { readFileSync } = require('fs');
const { dirname, resolve } = require('path');

const dotenv = require('dotenv');

const MAX_ENV_FILES = 3;

const ENV_FILE = resolve(process.cwd(), '..', process.env.DOTENV_FILE || '.env');

/** Whether DOTENV_FILE named the file, as opposed to falling back to .env. */
const ENV_FILE_NAMED = Boolean(process.env.DOTENV_FILE);

const ROOT_DIR = dirname(ENV_FILE);

/**
 * Load an env file to process.env.
 *
 * If an env file contains an EXTENDS directive,
 * fall back to the values in the referenced env file recursively.
 */
function loadEnvChain(entry) {
  const loaded = [];

  for (let file = entry; file; ) {
    if (loaded.includes(file)) {
      throw new Error(`EXTENDS loop in env files: ${[...loaded, file].join(' -> ')}`);
    }
    if (loaded.length >= MAX_ENV_FILES) {
      throw new Error(
        `Refusing to load more than ${MAX_ENV_FILES} env files, starting at ${entry}`,
      );
    }
    loaded.push(file);

    let contents;
    try {
      contents = readFileSync(file, 'utf-8');
    } catch (error) {
      // Only the default .env may be absent. A file named by DOTENV_FILE or reached through
      // EXTENDS was asked for by name, so missing it is an error rather than a fallback: the
      // alternative is starting up with no credentials and no indication why.
      if (file === entry && !ENV_FILE_NAMED && error.code === 'ENOENT') return;
      const from = loaded.at(-2);
      throw new Error(`Cannot read env file ${file}${from ? ` (extended from ${from})` : ''}`, {
        cause: error,
      });
    }

    // EXTENDS itself is a directive, not configuration, so it is not passed on to process.env.
    const { EXTENDS: parent, ...values } = dotenv.parse(contents);
    dotenv.populate(process.env, values, { override: false });

    file = parent && resolve(dirname(file), parent);
  }
}

loadEnvChain(ENV_FILE);

// Left undefined when unset, so that a missing credential surfaces as a login failure
// rather than as a request made with an empty id.
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const SERVER_PORT = process.env.SERVER_PORT || 8080;
const ENV = process.env.ENV || '';
const VITE_DEV_PORT = process.env.VITE_DEV_PORT || 8081;
const VITE_APP_NAME = process.env.VITE_APP_NAME || 'Heatmapper';
const VITE_APP_FAVICON = process.env.VITE_APP_FAVICON || '/favicon.ico';
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN || '';
const MAPBOX_STYLE = process.env.MAPBOX_STYLE;
// Attribution can be a comma-separated list of brands, or * to allow all brands. Leave blank for none.
const ATTRIBUTION = (process.env.ATTRIBUTION || 'Garmin')
  .replace(/^\*$/, ' ')
  .split(',')
  .filter(Boolean)
  .map((a) => a.trim());
const USE_STRAVA_ICONS = process.env.USE_STRAVA_ICONS && process.env.USE_STRAVA_ICONS !== 'false';
const VALIDATE_USER_BEFORE_CACHE =
  process.env.VALIDATE_USER_BEFORE_CACHE && process.env.VALIDATE_USER_BEFORE_CACHE !== 'false';
const SERVER_DOMAIN = process.env.SERVER_DOMAIN || `http://localhost:${SERVER_PORT}`;
const WEBHOOK_RECEIVER = process.env.WEBHOOK_RECEIVER || undefined;
const STRAVA_WEBHOOK_TOKEN = process.env.STRAVA_WEBHOOK_TOKEN || undefined;

const SESSIONS_DIR = resolve(ROOT_DIR, process.env.SESSIONS_DIR || 'server/sessions');

// Serve a mock of Strava from the backend, and use it in place of Strava
const MOCK_STRAVA = !['', '0', 'false', 'no', 'off'].includes(
  (process.env.MOCK_STRAVA || '').trim().toLowerCase(),
);
const STRAVA_OVERRIDE = process.env.STRAVA_BASE_URL?.replace(/\/+$/, '');
// The server reaches its own mock directly, while the browser has to go through SERVER_DOMAIN
const STRAVA_BASE_URL =
  STRAVA_OVERRIDE ||
  (MOCK_STRAVA ? `http://localhost:${SERVER_PORT}/mock-strava` : 'https://www.strava.com');
const STRAVA_BROWSER_BASE_URL =
  STRAVA_OVERRIDE || (MOCK_STRAVA ? `${SERVER_DOMAIN}/mock-strava` : 'https://www.strava.com');
// The mock's activities go back to this ISO date, or a year when blank
const MOCK_OLDEST_ACTIVITY = process.env.MOCK_OLDEST_ACTIVITY || '';
// The mock's present, as an ISO time, so that no new day's activity appears mid-run; now when blank
const MOCK_NOW = Date.parse(process.env.MOCK_NOW || '') || undefined;
const MOCK_ACTIVITY_TYPES = (process.env.MOCK_ACTIVITY_TYPES || 'Ride,Run,Walk')
  .split(',')
  .map((type) => type.trim())
  .filter(Boolean);
// How long the mock takes over a page of activities or routes, and over anything else
const delay = (value, fallback) => {
  const ms = Number(value?.trim() || fallback);
  return Number.isFinite(ms) && ms >= 0 ? ms : fallback;
};
const MOCK_PAGE_DELAY_MS = delay(process.env.MOCK_PAGE_DELAY_MS, 10000);
const MOCK_DELAY_MS = delay(process.env.MOCK_DELAY_MS, 500);

module.exports = {
  STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET,
  SERVER_PORT,
  VITE_DEV_PORT,
  VITE_APP_NAME,
  VITE_APP_FAVICON,
  SERVER_DOMAIN,
  WEBHOOK_RECEIVER,
  STRAVA_WEBHOOK_TOKEN,
  MAPBOX_TOKEN,
  ATTRIBUTION,
  USE_STRAVA_ICONS,
  VALIDATE_USER_BEFORE_CACHE,
  MAPBOX_STYLE,
  SESSIONS_DIR,
  ENV,
  MOCK_STRAVA,
  STRAVA_BASE_URL,
  STRAVA_BROWSER_BASE_URL,
  MOCK_OLDEST_ACTIVITY,
  MOCK_NOW,
  MOCK_ACTIVITY_TYPES,
  MOCK_PAGE_DELAY_MS,
  MOCK_DELAY_MS,
};
