import {
  MOCK_STRAVA,
  SERVER_DOMAIN,
  SERVER_PORT,
  SESSIONS_DIR,
  STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET,
  STRAVA_WEBHOOK_TOKEN,
  VITE_APP_NAME,
  WEBHOOK_RECEIVER,
} from '@strava-heatmapper/shared/config/dotenv';
import bodyParser from 'body-parser';
import history from 'connect-history-api-fallback';
import cookieParser from 'cookie-parser';
import express, { type RequestHandler } from 'express';
import expressWs from 'express-ws';
import { join } from 'path';

import apiRouter from './api';
import mockStravaRouter from './mock-strava';
import { WebhookRelay } from './webhook-relay';

const app = express();
const wsInstance = expressWs(app);
app.use(cookieParser());

app.use(bodyParser.json());

const relay = new WebhookRelay(
  SERVER_DOMAIN,
  WEBHOOK_RECEIVER,
  STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET,
  join(SESSIONS_DIR, 'webhook-peers.json'),
  STRAVA_WEBHOOK_TOKEN,
);

const corsConfig: RequestHandler = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', SERVER_DOMAIN);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
};

app.use(corsConfig);

app.use('/api', apiRouter(SERVER_DOMAIN, wsInstance, relay));

// Before the history fallback, which would answer the consent form with the app
if (MOCK_STRAVA) app.use('/mock-strava', mockStravaRouter());

// Support history api
app.use(
  history({
    index: '',
  }),
);
const compiledFrontEnd = __filename.includes('/dist/') ? '../client' : '../dist/client';

// Middleware for serving frontend directory
const staticFileMiddleware = express.static(compiledFrontEnd);

// 1st call for unredirected requests
app.use(staticFileMiddleware);

app.listen(SERVER_PORT, () => {
  console.log(`${VITE_APP_NAME} backend listening on port ${SERVER_PORT}.`);
  console.log(`Visit the latest version at ${SERVER_DOMAIN}/`);
  relay.start();
});
