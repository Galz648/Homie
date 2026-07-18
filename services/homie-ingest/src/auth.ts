export function extractBearerToken(
  authorizationHeader: string | null | undefined,
): string | null {
  if (!authorizationHeader) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(authorizationHeader.trim());
  return match?.[1] ?? null;
}

export function authorizeBearer(
  authorizationHeader: string | null | undefined,
  expectedToken: string,
): boolean {
  if (!expectedToken) return false;
  const provided = extractBearerToken(authorizationHeader);
  return provided !== null && provided === expectedToken;
}
