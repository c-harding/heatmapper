import { type RequestHandler } from 'express';
import { createReadStream } from 'fs';

import { tokenExchange, validTokenCallback } from '../strava/token';

export const getToken: RequestHandler = (req, res) => {
  let code: number, html: string;
  try {
    const successful = validTokenCallback(req.query) && tokenExchange(req.query);
    [code, html] = successful ? [200, 'static/auth.html'] : [400, 'static/auth-error.html'];
  } catch {
    [code, html] = [500, 'static/auth-error.html'];
  }
  res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8' });
  createReadStream(html).pipe(res);
};
