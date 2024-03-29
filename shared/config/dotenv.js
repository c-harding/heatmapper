/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-env node */

require('dotenv').config({
  path: require('path').resolve(process.cwd(), '..', process.env.DOTENV_FILE || '.env'),
});

const SERVER_PORT = process.env.SERVER_PORT || 8080;
const ENV = process.env.ENV || '';
const VITE_DEV_PORT = process.env.VITE_DEV_PORT || 8081;
const VITE_APP_NAME = process.env.VITE_APP_NAME || 'Heatmapper';
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN || '';
const MAPBOX_STYLE = process.env.MAPBOX_STYLE;
const USE_STRAVA_ICONS = process.env.USE_STRAVA_ICONS && process.env.USE_STRAVA_ICONS !== 'false';
const VALIDATE_USER_BEFORE_CACHE =
  process.env.VALIDATE_USER_BEFORE_CACHE && process.env.VALIDATE_USER_BEFORE_CACHE !== 'false';
const SERVER_DOMAIN = process.env.SERVER_DOMAIN || `http://localhost:${SERVER_PORT}`;

module.exports = {
  SERVER_PORT,
  VITE_DEV_PORT,
  VITE_APP_NAME,
  SERVER_DOMAIN,
  MAPBOX_TOKEN,
  USE_STRAVA_ICONS,
  VALIDATE_USER_BEFORE_CACHE,
  MAPBOX_STYLE,
  ENV,
};
