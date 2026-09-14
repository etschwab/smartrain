import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { safeLocalPath } from "@/lib/safe-redirect";
import { getOptionalUser } from "@/lib/supabase-server";
import { dataServiceUnavailableMessage, isSupabaseConnectionError } from "@/lib/supabase-errors";
import { getSsoConfig } from "@/lib/sso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Konto erstellen",
  description: "Erstelle in wenigen Minuten deinen kostenlosen Smartrain-Teamraum."
};

type SignupPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const { user, authError } = await getOptionalUser();

  if (user) {
    redirect(safeLocalPath(params.next, "/dashboard"));
  }

  if (getSsoConfig()) {
    redirect(`/auth/sso/start?next=${encodeURIComponent(safeLocalPath(params.next, "/dashboard"))}`);
  }

  return (
    <main id="main-content" className="content-wrap flex min-h-[calc(100svh-8rem)] items-center py-8 sm:py-14">
      <AuthForm
        mode="signup"
        nextPath={params.next}
        initialMessage={isSupabaseConnectionError(authError) ? dataServiceUnavailableMessage : undefined}
      />
    </main>
  );
}
