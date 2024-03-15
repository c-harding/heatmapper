/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-env node */

require('dotenv').config({
  path: require('path').resolve(process.cwd(), '..', process.env.DOTENV_FILE || '.env'),
});

const SERVER_PORT = process.env.SERVER_PORT || 8080;
const VITE_DEV_PORT = process.env.VITE_DEV_PORT || 8081;
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN || '';
const MAPBOX_STYLE = process.env.MAPBOX_STYLE;
const USE_EMOJI = process.env.USE_EMOJI && process.env.USE_EMOJI !== 'false';
const SERVER_DOMAIN = process.env.SERVER_DOMAIN || `http://localhost:${SERVER_PORT}`;

module.exports = {
  SERVER_PORT,
  VITE_DEV_PORT,
  SERVER_DOMAIN,
  MAPBOX_TOKEN,
  USE_EMOJI,
  MAPBOX_STYLE,
};
