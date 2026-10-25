import { type Request, type RequestHandler, type Response } from 'express';

export function extractRequestToken(req: Request): string | undefined {
  return req.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? req.cookies.token;
}

/** Answers that the browser must log in with Strava, which the app takes from a 403 with a token */
export function requestLogin(res: Response) {
  return async (token: string, url: string) => {
    res.status(403).header('location', url).send({ token });
    return false;
  };
}

/** Refuses a request sent from any page but this site's own */
export function sameOrigin(domain: string): RequestHandler {
  const { origin } = new URL(domain);
  // Old cookies have no SameSite, and SameSite still sends cookies from sibling subdomains
  return (req, res, next) => {
    if (req.get('origin') === origin) next();
    else res.status(403).send('Forbidden');
  };
}
