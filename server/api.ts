import express from 'express';
import { type Router } from 'express-ws';

import { ActivitiesHandler } from './routes/activities';
import { getToken } from './routes/token';
import { UserHandler } from './routes/user';

const VERSION = 2;

export default function apiRouter(domain: string): express.Router {
  const router = express.Router() as Router;

  const activitiesHandler = new ActivitiesHandler(domain, VERSION);
  router.ws('/activities', activitiesHandler.get);

  router.get('/token', getToken);

  const userHandler = new UserHandler(domain);
  router.get('/user', userHandler.get);
  router.delete('/user', userHandler.delete);

  return router;
}
