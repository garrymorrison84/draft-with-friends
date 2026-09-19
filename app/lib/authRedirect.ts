export const DEFAULT_AUTH_REDIRECT = "/organizer";
export const PENDING_AUTH_REDIRECT_KEY = "dwf-post-auth-redirect";
export const USER_REDIRECT_METADATA_KEY = "post_auth_redirect";

export function parseAuthRedirect(value: unknown) {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
    ? value
    : null;
}

export function safeAuthRedirect(value: unknown) {
  return parseAuthRedirect(value) || DEFAULT_AUTH_REDIRECT;
}

export function rememberAuthRedirect(value: unknown) {
  const redirect = parseAuthRedirect(value);
  if (typeof window === "undefined" || !redirect) return;
  window.localStorage.setItem(PENDING_AUTH_REDIRECT_KEY, redirect);
}

export function readRememberedAuthRedirect() {
  if (typeof window === "undefined") return null;
  return parseAuthRedirect(
    window.localStorage.getItem(PENDING_AUTH_REDIRECT_KEY)
  );
}

export function clearRememberedAuthRedirect() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_AUTH_REDIRECT_KEY);
}
