/**
 * Returns JWT token's payload data.
 */
export function getTokenPayload(token: string): Record<string, unknown> {
    if (token) {
        try {
            const encodedPayload = decodeURIComponent(
                atob(token.split(".")[1])
                    .split("")
                    .map(function (c: string) {
                        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
                    })
                    .join(""),
            );

            return JSON.parse(encodedPayload) || {};
        } catch (e) {
            console.error("Failed to parse token payload.", e);
        }
    }

    return {};
}

function possiblyValidPayload(
    payload: Record<string, unknown>,
): payload is { [key: string]: unknown; exp: number } {
    return (
        typeof payload === "object" && payload !== null && Object.keys(payload).length > 0
    );
}

/**
 * Checks whether a JWT token is expired or not.
 * Tokens without `exp` payload key are considered valid.
 * Tokens with empty payload (eg. invalid token strings) are considered expired.
 *
 * @param token The token to check.
 * @param [expirationThreshold] Time in seconds that will be subtracted from the token `exp` property.
 */
export function isTokenExpired(token: string, expirationThreshold = 0): boolean {
    const payload = getTokenPayload(token);
    if (!possiblyValidPayload(payload)) throw new Error("Invalid token payload.");

    if (
        Object.keys(payload).length > 0 &&
        (!payload.exp || payload.exp - expirationThreshold > Date.now() / 1000)
    ) {
        return false;
    }

    return true;
}
