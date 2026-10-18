import { type Request } from 'express';

export function extractRequestToken(req: Request): string | undefined {
  return req.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? req.cookies.token;
}
