// Signs the requests deployments send each other, and those yarn webhook-subscription sends the
// receiver, with the app's client secret. Plain JavaScript, so that the script can use it as it is.
const { createHmac, timingSafeEqual } = require('crypto');

const SIGNATURE_HEADER = 'X-Heatmapper-Signature';

/** How long a signed request stays valid, so that a captured one cannot be replayed later */
const SIGNATURE_LIFETIME = 5 * 60 * 1000;

/**
 * A signature over the path a request is sent to and its body, so that it can be neither altered
 * nor sent to another route.
 *
 * @param {string} path
 * @param {string} body
 * @param {string} secret
 * @param {number} [now]
 * @returns {string}
 */
function sign(path, body, secret, now = Date.now()) {
  const mac = createHmac('sha256', secret).update(`${now}.${path}.${body}`).digest('hex');
  return `t=${now},v1=${mac}`;
}

/**
 * @param {string | undefined} header
 * @param {string} path
 * @param {string} body
 * @param {string} secret
 * @param {number} [now]
 * @returns {boolean}
 */
function verify(header, path, body, secret, now = Date.now()) {
  const { t, v1 } = Object.fromEntries((header ?? '').split(',').map((part) => part.split('=', 2)));
  const time = Number(t);
  if (!v1 || !Number.isFinite(time) || Math.abs(now - time) > SIGNATURE_LIFETIME) return false;
  const expected = Buffer.from(sign(path, body, secret, time).split('v1=')[1], 'hex');
  const given = Buffer.from(v1, 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

module.exports = { SIGNATURE_HEADER, sign, verify };
