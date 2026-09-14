import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { SsoErrorCard } from "@/components/auth/sso-error-card";
import { safeLocalPath } from "@/lib/safe-redirect";
import { getOptionalUser } from "@/lib/supabase-server";
import { dataServiceUnavailableMessage, isSupabaseConnectionError } from "@/lib/supabase-errors";
import { getSsoConfig } from "@/lib/sso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Anmelden",
  description: "Melde dich bei Smartrain an, um deine Teams, Trainings und Events zu verwalten."
};

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
};

const errorMap: Record<string, string> = {
  auth_callback_failed: "Der Login-Link konnte nicht bestätigt werden. Bitte versuche es erneut.",
  backend_unavailable: dataServiceUnavailableMessage
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = safeLocalPath(params.next, "/dashboard");
  const { user, authError } = await getOptionalUser();

  if (user) {
    redirect(nextPath);
  }

  if (getSsoConfig()) {
    if (params.error?.startsWith("sso_")) {
      return (
        <main id="main-content" className="content-wrap flex min-h-[calc(100svh-8rem)] items-center py-8 sm:py-14">
          <SsoErrorCard error={params.error} nextPath={nextPath} />
        </main>
      );
    }

    redirect(`/auth/sso/start?next=${encodeURIComponent(nextPath)}`);
  }

  return (
    <main id="main-content" className="content-wrap flex min-h-[calc(100svh-8rem)] items-center py-8 sm:py-14">
      <AuthForm
        mode="login"
        nextPath={params.next}
        initialMessage={
          params.error
            ? errorMap[params.error]
            : isSupabaseConnectionError(authError)
              ? dataServiceUnavailableMessage
              : undefined
        }
      />
    </main>
  );
}
