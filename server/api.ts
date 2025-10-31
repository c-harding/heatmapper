import express from 'express';
import { type Router } from 'express-ws';

import { ActivitiesHandler } from './routes/activities';
import { HookHandler } from './routes/hook';
import { getToken } from './routes/token';
import { UserHandler } from './routes/user';

/**
 * The current model version. Increment this when making breaking changes to the API,
 * or changes that require a full re-download of user data.
 *
 * Change log:
 * - 5: Added device field to activities to comply with Garmin Connect rules.
 */
const MODEL_VERSION = 5;

export default function apiRouter(domain: string): express.Router {
  const router = express.Router() as Router;

  const activitiesHandler = new ActivitiesHandler(domain, MODEL_VERSION);
  router.ws('/activities', activitiesHandler.get);

  router.get('/token', getToken);

  const userHandler = new UserHandler(domain);
  router.get('/user', userHandler.get);
  router.delete('/user', userHandler.delete);

  const hookHandler = new HookHandler(domain);
  router.get('/hook', hookHandler.get);
  router.post('/hook', hookHandler.post);

  return router;
}
