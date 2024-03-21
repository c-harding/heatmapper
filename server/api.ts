import express from 'express';
import { type Router } from 'express-ws';

import { ActivitiesHandler } from './routes/activities';
import { HookHandler } from './routes/hook';
import { getToken } from './routes/token';
import { UserHandler } from './routes/user';

const MODEL_VERSION = 4;

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
