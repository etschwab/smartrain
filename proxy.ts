import { NextResponse, type NextRequest } from "next/server";
import {
  clearSsoSessionCookies,
  getSsoConfig,
  jwtExpiresSoon,
  refreshSsoTokens,
  setSsoSessionCookies,
  SSO_ACCESS_COOKIE,
  SSO_REFRESH_COOKIE
} from "@/lib/sso";

const refreshes = new Map<string, ReturnType<typeof refreshSsoTokens>>();

function refreshOnce(config: NonNullable<ReturnType<typeof getSsoConfig>>, refreshToken: string) {
  const pending = refreshes.get(refreshToken);

  if (pending) {
    return pending;
  }

  const refresh = refreshSsoTokens(config, refreshToken).finally(() => {
    if (refreshes.get(refreshToken) === refresh) {
      refreshes.delete(refreshToken);
    }
  });

  refreshes.set(refreshToken, refresh);
  return refresh;
}

function withUpdatedCookieHeader(currentHeader: string | null, updates: Record<string, string | null>) {
  const cookies = new Map<string, string>();

  for (const part of currentHeader?.split(";") ?? []) {
    const separator = part.indexOf("=");

    if (separator > 0) {
      cookies.set(part.slice(0, separator).trim(), part.slice(separator + 1).trim());
    }
  }

  for (const [name, value] of Object.entries(updates)) {
    if (value === null) {
      cookies.delete(name);
    } else {
      cookies.set(name, value);
    }
  }

  return Array.from(cookies, ([name, value]) => `${name}=${value}`).join("; ");
}

export async function proxy(request: NextRequest) {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const requestHost = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(":")[0].toLowerCase();

  // Only production *.vercel.app aliases move to the custom domain; preview
  // deployments must stay reachable on their own URL to be tested.
  if (configuredSiteUrl && process.env.VERCEL_ENV === "production" && requestHost.endsWith(".vercel.app")) {
    const canonicalUrl = new URL(configuredSiteUrl);

    if (requestHost !== canonicalUrl.hostname.toLowerCase()) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.protocol = canonicalUrl.protocol;
      redirectUrl.host = canonicalUrl.host;

      return NextResponse.redirect(redirectUrl, 308);
    }
  }

  const requestHeaders = new Headers(request.headers);
  const currentPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  requestHeaders.set("x-current-path", currentPath);

  const config = getSsoConfig();
  const accessToken = request.cookies.get(SSO_ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(SSO_REFRESH_COOKIE)?.value;

  if (config && refreshToken && (!accessToken || jwtExpiresSoon(accessToken))) {
    const result = await refreshOnce(config, refreshToken);
    const tokens = result.tokens;

    if (tokens) {
      requestHeaders.set(
        "cookie",
        withUpdatedCookieHeader(request.headers.get("cookie"), {
          [SSO_ACCESS_COOKIE]: tokens.accessToken,
          [SSO_REFRESH_COOKIE]: tokens.refreshToken
        })
      );
      const response = NextResponse.next({ request: { headers: requestHeaders } });
      setSsoSessionCookies(response, tokens);
      return response;
    }

    if (result.invalid) {
      requestHeaders.set(
        "cookie",
        withUpdatedCookieHeader(request.headers.get("cookie"), {
          [SSO_ACCESS_COOKIE]: null,
          [SSO_REFRESH_COOKIE]: null
        })
      );
      const response = NextResponse.next({ request: { headers: requestHeaders } });
      clearSsoSessionCookies(response);
      return response;
    }

    // Bei einem vorübergehenden Token-Endpunkt-Fehler bleiben die Cookies
    // erhalten. Ein noch gültiges Token funktioniert weiter; ein abgelaufenes
    // Token wird beim nächsten Request erneut erneuert statt den Nutzer
    // vorschnell vollständig abzumelden.
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
