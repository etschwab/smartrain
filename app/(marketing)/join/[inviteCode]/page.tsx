import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { joinTeamAction } from "@/lib/actions";
import { getPublicInvite } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase-admin";
import { getOptionalUser } from "@/lib/supabase-server";
import { getRoleLabel, isFutureDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Einladung",
  description: "Tritt einem Team auf Smartrain bei."
};

type JoinPageProps = {
  params: Promise<{
    inviteCode: string;
  }>;
};

export default async function JoinPage({ params }: JoinPageProps) {
  const { inviteCode } = await params;
  const { supabase, user } = await getOptionalUser();
  const readSupabase = createAdminClient() ?? supabase;
  const invite = await getPublicInvite(readSupabase, inviteCode);

  const isExpired = Boolean(invite?.expires_at && !isFutureDate(invite.expires_at));

  if (!invite || !invite.is_active || isExpired) {
    return (
      <main id="main-content" className="content-wrap py-16">
        <EmptyState
          title="Einladungslink nicht verfügbar"
          description="Dieser Link ist nicht mehr aktiv. Bitte frag deinen Coach nach einem neuen Link."
          action={
            <Button asChild>
              <Link href="/">Zur Startseite</Link>
            </Button>
          }
        />
      </main>
    );
  }

  if (user) {
    const { data: membership } = await readSupabase
      .from("team_members")
      .select("team_id")
      .eq("team_id", invite.team_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membership) {
      redirect(`/teams/${invite.team_id}`);
    }
  }

  const joinPath = `/join/${invite.code}`;

  return (
    <main id="main-content" className="content-wrap py-12 sm:py-20">
      <Card className="mx-auto max-w-md p-6 text-center sm:p-8">
        <p className="section-kicker">Einladung</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{invite.team_name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {invite.team_sport} · Du trittst als <span className="font-medium text-foreground">{getRoleLabel(invite.role)}</span> bei.
        </p>

        {user ? (
          <form action={joinTeamAction.bind(null, invite.code)} className="mt-6">
            <SubmitButton size="lg" className="w-full" pendingLabel="Wird beigetreten...">
              Team beitreten
            </SubmitButton>
          </form>
        ) : (
          <div className="mt-6 grid gap-2">
            <Button asChild size="lg">
              <Link href={`/signup?next=${encodeURIComponent(joinPath)}`}>Konto erstellen und beitreten</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href={`/login?next=${encodeURIComponent(joinPath)}`}>Ich habe schon ein Konto</Link>
            </Button>
          </div>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          Danach siehst du alle Termine des Teams und kannst direkt zu- oder absagen.
        </p>
      </Card>
    </main>
  );
}
