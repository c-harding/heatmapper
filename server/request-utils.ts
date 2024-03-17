import { type Request } from 'express';

export function extractRequestToken(req: Request): string | undefined {
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ', 2)[2];
  } else {
    return req.cookies.token;
  }
}
