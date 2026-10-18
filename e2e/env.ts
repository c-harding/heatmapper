import { tmpdir } from 'os';
import { join } from 'path';

/** Ports of their own, so that the suite never talks to a dev server that isn't mocking Strava */
export const SERVER_PORT = Number(process.env.E2E_SERVER_PORT || 18080);
export const CLIENT_PORT = Number(process.env.E2E_CLIENT_PORT || 18081);

export const SERVER_URL = `http://localhost:${SERVER_PORT}`;
export const CLIENT_URL = `http://localhost:${CLIENT_PORT}`;

/** Sessions start afresh on every run */
export const SESSIONS_DIR = join(tmpdir(), `heatmapper-e2e-sessions-${SERVER_PORT}`);

export const DAY = 24 * 60 * 60 * 1000;

// Worked out once in the runner and inherited by the workers, so that all of them agree with the
// server started with these
process.env.E2E_MOCK_NOW ||= new Date().toISOString();
process.env.E2E_OLDEST_ACTIVITY ||= new Date(Date.parse(process.env.E2E_MOCK_NOW) - 730 * DAY)
  .toISOString()
  .slice(0, 10);

/** The mock's present, pinned for the whole run, so that no new day's activity arrives mid-test */
export const MOCK_NOW = Date.parse(process.env.E2E_MOCK_NOW);

/** Two years of daily activities: four pages of 200 */
export const OLDEST_ACTIVITY = process.env.E2E_OLDEST_ACTIVITY;

export const MOCK_ENV = {
  MOCK_STRAVA: 'true',
  // Blank, so that one in the environment or .env cannot send the backend elsewhere
  STRAVA_BASE_URL: '',
  MOCK_OLDEST_ACTIVITY: OLDEST_ACTIVITY,
  MOCK_NOW: process.env.E2E_MOCK_NOW,
  MOCK_ACTIVITY_TYPES: 'Ride,Run,Walk',
  MOCK_PAGE_DELAY_MS: '500',
  MOCK_DELAY_MS: '50',
};
