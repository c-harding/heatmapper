// Set in vite.config.js
declare const MAPBOX_TOKEN: string;
declare const MAPBOX_STYLE: string;
declare const USE_STRAVA_ICONS: boolean;
declare const VALIDATE_USER_BEFORE_CACHE: boolean;
declare const GIT_HASH: string | undefined;

const config = {
  MAPBOX_TOKEN,
  MAPBOX_STYLE,
  USE_STRAVA_ICONS,
  VALIDATE_USER_BEFORE_CACHE,
  GIT_HASH,
};

export default config;
