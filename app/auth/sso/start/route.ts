import { NextResponse, type NextRequest } from "next/server";
import { safeLocalPath } from "@/lib/safe-redirect";
import { buildAuthorizationUrl, createPkceFlow, getSsoConfig, isAuthServerReachable, setSsoFlowCookies } from "@/lib/sso";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const config = getSsoConfig();

  if (!config) {
    return NextResponse.redirect(new URL("/login?error=sso_not_configured", request.url));
  }

  const nextPath = safeLocalPath(request.nextUrl.searchParams.get("next"), "/dashboard");

  if (!(await isAuthServerReachable(config))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "sso_unavailable");
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  const flow = await createPkceFlow();
  const response = NextResponse.redirect(buildAuthorizationUrl(config, flow.challenge, flow.state));

  setSsoFlowCookies(response, {
    state: flow.state,
    verifier: flow.verifier,
    nextPath
  });

  return response;
}

