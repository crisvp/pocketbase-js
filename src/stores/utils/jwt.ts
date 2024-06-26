/**
 * Returns JWT token's payload data.
 */
import * as jose from 'jose';
import { JWTInvalid } from 'jose/errors';

export function getTokenPayload<T extends jose.JWTPayload>(token: string): T {
  try {
    return jose.decodeJwt<T>(token);
  } catch (e) {
    console.warn(`Could not decode token: '${token}': ${e instanceof Error ? e.message : e}`);
    throw e;
  }
}

function possiblyValidPayload(payload: Record<string, unknown>): payload is { [key: string]: unknown; exp: number } {
  return typeof payload === 'object' && payload !== null && 'exp' in payload;
}

export function jwtValid(token: string): boolean {
  try {
    return !isTokenExpired(token);
  } catch (e) {
    if (e instanceof JWTInvalid) return false;
    throw e;
  }
}

export function jwtExpiration(token: string): number {
  const payload = getTokenPayload(token);
  if (!possiblyValidPayload(payload)) throw new Error('Invalid token payload.');

  return payload.exp;
}

/**
 * Checks whether a JWT token is expired or not.
 * Tokens without `exp` payload key are considered valid.
 * Tokens with empty payload (eg. invalid token strings) are considered expired.
 *
 * @param token The token to check.
 * @param [expirationThreshold] Time in seconds before expiration to consider the token expired
 */
export function isTokenExpired(token: string, expirationThreshold = 0): boolean {
  const expiration = jwtExpiration(token);
  return expiration - expirationThreshold < Date.now() / 1000;
}
