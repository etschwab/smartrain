import type { NextResponse } from "next/server";
import { getSupabaseUrl } from "./env";
import { getSiteUrl } from "./site-url";

export const SSO_ACCESS_COOKIE = "smartrain-sso-access";
export const SSO_REFRESH_COOKIE = "smartrain-sso-refresh";
export const SSO_STATE_COOKIE = "smartrain-sso-state";
export const SSO_VERIFIER_COOKIE = "smartrain-sso-verifier";
export const SSO_NEXT_COOKIE = "smartrain-sso-next";

const SSO_FLOW_MAX_AGE = 10 * 60;
// The refresh-token cookie's own Max-Age. Each refresh (see proxy.ts) resets it
// to this value again, so an actively used session keeps working - this only
// bounds how long a dormant cookie (idle browser, old device, stolen and never
// used) stays valid before it's forced to expire and re-authenticate.
const SSO_REFRESH_MAX_AGE = 45 * 24 * 60 * 60;

export type SsoTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type SsoRefreshResult =
  | { tokens: SsoTokens; invalid: false }
  | { tokens: null; invalid: boolean };

export type SsoConfig = {
  authUrl: string;
  siteUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizeEndpoint: string;
  tokenEndpoint: string;
};

function normalizeOrigin(value: string, variableName: string) {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  let url: URL;

  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error(`${variableName} ist keine gültige URL.`);
  }

  const isLocal = url.hostname === "localhost" || url.hostname.endsWith(".localhost") || url.hostname === "127.0.0.1";

  if (process.env.NODE_ENV === "production" && (url.protocol !== "https:" || isLocal)) {
    throw new Error(`${variableName} muss in Produktion eine öffentliche HTTPS-URL sein.`);
  }

  return url.origin;
}

export function getAuthUrl() {
  const value = process.env.NEXT_PUBLIC_AUTH_URL?.trim();
  return value ? normalizeOrigin(value, "NEXT_PUBLIC_AUTH_URL") : null;
}

export function getSsoConfig(): SsoConfig | null {
  const authUrl = getAuthUrl();
  const clientId = process.env.SUPABASE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.SUPABASE_OAUTH_CLIENT_SECRET?.trim();

  if (!authUrl && !clientId && !clientSecret) {
    return null;
  }

  if (!authUrl || !clientId || !clientSecret) {
    throw new Error(
      "Für SSO müssen NEXT_PUBLIC_AUTH_URL, SUPABASE_OAUTH_CLIENT_ID und SUPABASE_OAUTH_CLIENT_SECRET gemeinsam gesetzt sein."
    );
  }

  const siteUrl = getSiteUrl();
  const supabaseUrl = getSupabaseUrl();

  return {
    authUrl,
    siteUrl,
    clientId,
    clientSecret,
    redirectUri: `${siteUrl}/auth/sso/callback`,
    authorizeEndpoint: `${supabaseUrl}/auth/v1/oauth/authorize`,
    tokenEndpoint: `${supabaseUrl}/auth/v1/oauth/token`
  };
}

function randomBase64Url(byteLength = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function createPkceFlow() {
  const verifier = randomBase64Url(48);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  let binary = "";

  for (const byte of new Uint8Array(digest)) {
    binary += String.fromCharCode(byte);
  }

  return {
    verifier,
    challenge: btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""),
    state: randomBase64Url(32)
  };
}

export function buildAuthorizationUrl(config: SsoConfig, challenge: string, state: string) {
  const url = new URL(config.authorizeEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("scope", "email profile");
  return url;
}

function parseTokenResponse(value: unknown): SsoTokens | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const response = value as Record<string, unknown>;

  if (
    typeof response.access_token !== "string" ||
    typeof response.refresh_token !== "string" ||
    typeof response.expires_in !== "number" ||
    response.expires_in <= 0
  ) {
    return null;
  }

  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresIn: response.expires_in
  };
}

async function requestTokens(config: SsoConfig, body: URLSearchParams): Promise<SsoRefreshResult> {
  try {
    const credentials = btoa(`${config.clientId}:${config.clientSecret}`);
    const response = await fetch(config.tokenEndpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000)
    });

    if (!response.ok) {
      return { tokens: null, invalid: response.status === 400 || response.status === 401 };
    }

    const tokens = parseTokenResponse(await response.json());
    return tokens ? { tokens, invalid: false } : { tokens: null, invalid: true };
  } catch {
    return { tokens: null, invalid: false };
  }
}

export async function exchangeSsoCode(config: SsoConfig, code: string, verifier: string) {
  const result = await requestTokens(
    config,
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      code_verifier: verifier
    })
  );

  return result.tokens;
}

export function refreshSsoTokens(config: SsoConfig, refreshToken: string): Promise<SsoRefreshResult> {
  return requestTokens(
    config,
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken
    })
  );
}

export function constantTimeEqual(left: string, right: string) {
  let mismatch = left.length ^ right.length;
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return mismatch === 0;
}

export function jwtExpiresSoon(token: string, seconds = 90) {
  try {
    const encodedPayload = token.split(".")[1];
    const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encodedPayload.length / 4) * 4, "=");
    const payload = JSON.parse(atob(normalized)) as { exp?: unknown };
    return typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000) + seconds;
  } catch {
    return true;
  }
}

function secureCookies() {
  return process.env.NODE_ENV === "production";
}

export function setSsoSessionCookies(response: NextResponse, tokens: SsoTokens) {
  response.cookies.set(SSO_ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    priority: "high",
    maxAge: tokens.expiresIn
  });
  response.cookies.set(SSO_REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    priority: "high",
    maxAge: SSO_REFRESH_MAX_AGE
  });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Pragma", "no-cache");
}

export function clearSsoSessionCookies(response: NextResponse) {
  response.cookies.set(SSO_ACCESS_COOKIE, "", { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", maxAge: 0 });
  response.cookies.set(SSO_REFRESH_COOKIE, "", { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", maxAge: 0 });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Pragma", "no-cache");
}

export function setSsoFlowCookies(response: NextResponse, flow: { state: string; verifier: string; nextPath: string }) {
  const options = {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax" as const,
    path: "/auth/sso",
    maxAge: SSO_FLOW_MAX_AGE
  };

  response.cookies.set(SSO_STATE_COOKIE, flow.state, options);
  response.cookies.set(SSO_VERIFIER_COOKIE, flow.verifier, options);
  response.cookies.set(SSO_NEXT_COOKIE, flow.nextPath, options);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Pragma", "no-cache");
}

export function clearSsoFlowCookies(response: NextResponse) {
  const options = { httpOnly: true, secure: secureCookies(), sameSite: "lax" as const, path: "/auth/sso", maxAge: 0 };
  response.cookies.set(SSO_STATE_COOKIE, "", options);
  response.cookies.set(SSO_VERIFIER_COOKIE, "", options);
  response.cookies.set(SSO_NEXT_COOKIE, "", options);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Pragma", "no-cache");
}
