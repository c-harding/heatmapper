import { SERVER_DOMAIN, SERVER_PORT, VITE_APP_NAME } from '@strava-heatmapper/shared/config/dotenv';
import bodyParser from 'body-parser';
import history from 'connect-history-api-fallback';
import cookieParser from 'cookie-parser';
import express, { type RequestHandler } from 'express';
import expressWs from 'express-ws';

import apiRouter from './api';

const app = express();
expressWs(app);
app.use(cookieParser());

app.use(bodyParser.json());

const corsConfig: RequestHandler = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', SERVER_DOMAIN);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
};

app.use(corsConfig);

app.use('/api', apiRouter(SERVER_DOMAIN));

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
});
