// Pure helpers of the consent page (tested with node --test).

/** The authorization request id from the page address. */
export function authorizationId(href) {
  const id = new URL(href).searchParams.get("authorization_id");
  return id && /^[A-Za-z0-9_-]{6,128}$/.test(id) ? id : null;
}

/** Where the sign-in email link brings the user back (same request, no code). */
export function returnUrl(href, id) {
  const u = new URL(href);
  return `${u.origin}${u.pathname}?authorization_id=${encodeURIComponent(id)}`;
}

/** Host of the app the user is sending access to, shown on the consent screen. */
export function redirectHost(uri) {
  try {
    return new URL(uri).host;
  } catch {
    return "unknown";
  }
}

/** True when Claude's own callback is the destination. */
export function isClaude(uri) {
  const host = redirectHost(uri);
  return host === "claude.ai" || host === "claude.com";
}

export function looksLikeEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@.]+$/.test(String(s).trim());
}
