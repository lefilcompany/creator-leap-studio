/**
 * Centralized auth URL utility for OAuth redirects and email links.
 * Ensures production always uses the canonical custom domain.
 */

const PRODUCTION_DOMAIN = "pla.creator.lefil.com.br";
const PRODUCTION_URL = `https://${PRODUCTION_DOMAIN}`;

const ALLOWED_DOMAINS = [
  PRODUCTION_DOMAIN,
  `www.${PRODUCTION_DOMAIN}`,
];

/**
 * Returns the canonical base URL for auth redirects.
 * In production (custom domain), always returns the canonical URL.
 * In dev/preview, returns window.location.origin.
 */
export function getAuthBaseUrl(): string {
  const hostname = window.location.hostname;

  // Production: force canonical domain (strips www)
  if (hostname === PRODUCTION_DOMAIN || hostname === `www.${PRODUCTION_DOMAIN}`) {
    return PRODUCTION_URL;
  }

  // Dev/preview: use current origin
  if (!ALLOWED_DOMAINS.includes(hostname)) {
    console.warn(
      `[auth-urls] Current hostname "${hostname}" is not in the allowed list. Using window.location.origin as fallback.`
    );
  }

  return window.location.origin;
}

/**
 * Returns the redirect_uri for OAuth providers (Google).
 * This is passed to lovable.auth.signInWithOAuth as redirect_uri.
 */
export function getOAuthRedirectUri(): string {
  return `${getAuthBaseUrl()}/~oauth/callback`;
}

/**
 * Returns a full URL for email-based redirects (signup confirmation, password reset).
 * @param path - The path to append (e.g. '/dashboard', '/reset-password')
 */
export function getEmailRedirectUrl(path: string): string {
  const base = getAuthBaseUrl();
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

/**
 * Validates a returnUrl to prevent open redirect attacks.
 * Only allows internal relative paths.
 */
export function validateReturnUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") {
    return "/dashboard";
  }

  const trimmed = url.trim();

  // Block protocol-relative URLs
  if (trimmed.startsWith("//")) {
    console.warn(`[auth-urls] Blocked potentially malicious returnUrl: "${trimmed}"`);
    return "/dashboard";
  }

  // Block absolute URLs with protocol
  if (trimmed.includes("://")) {
    console.warn(`[auth-urls] Blocked external returnUrl: "${trimmed}"`);
    return "/dashboard";
  }

  // Must start with /
  if (!trimmed.startsWith("/")) {
    console.warn(`[auth-urls] Invalid returnUrl format: "${trimmed}"`);
    return "/dashboard";
  }

  return trimmed;
}
