import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { joinTeamAction } from "@/lib/actions";
import { getPublicInvite } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase-admin";
import { getOptionalUser } from "@/lib/supabase-server";
import { getRoleLabel } from "@/lib/utils";

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

  if (!invite || !invite.is_active) {
    return (
      <main id="main-content" className="content-wrap py-16">
        <EmptyState
          title="Einladungslink nicht verfügbar"
          description="Dieser Join-Link ist nicht mehr aktiv oder wurde bereits deaktiviert."
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

  return (
    <main id="main-content" className="content-wrap py-16">
      <Card className="mx-auto max-w-3xl overflow-hidden p-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
          <div>
            <p className="section-kicker">Teambeitritt</p>
            <h1 className="mt-3 text-4xl font-semibold">{invite.team_name}</h1>
            <p className="mt-3 text-muted-foreground">
              Du wurdest eingeladen, diesem Team direkt beizutreten. Nach dem Login oder Signup landest du ohne Umwege im Teamraum.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Badge>{invite.team_sport}</Badge>
              <Badge variant="outline">Rolle: {getRoleLabel(invite.role)}</Badge>
              <Badge variant={invite.is_active ? "success" : "muted"}>{invite.is_active ? "Aktiver Invite" : "Inaktiv"}</Badge>
            </div>

            {user ? (
              <form action={joinTeamAction.bind(null, invite.code)} className="mt-8">
                <Button type="submit" size="lg">
                  Jetzt Team beitreten
                </Button>
              </form>
            ) : (
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href={`/login?next=${encodeURIComponent(`/join/${invite.code}`)}`}>Einloggen und beitreten</Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href={`/signup?next=${encodeURIComponent(`/join/${invite.code}`)}`}>Account erstellen und beitreten</Link>
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-none border border-border bg-background/70 p-6">
            <p className="section-kicker">So geht es weiter</p>
            <div className="mt-4 space-y-4 text-sm text-muted-foreground">
              <div className="rounded-3xl border border-border bg-card/70 p-4">
                <p className="font-semibold text-foreground">1. Account öffnen</p>
                <p className="mt-1">Mit Passwort oder Magic Link anmelden.</p>
              </div>
              <div className="rounded-3xl border border-border bg-card/70 p-4">
                <p className="font-semibold text-foreground">2. Team beitreten</p>
                <p className="mt-1">Der Join-Button aktiviert sofort deine Mitgliedschaft.</p>
              </div>
              <div className="rounded-3xl border border-border bg-card/70 p-4">
                <p className="font-semibold text-foreground">3. Trainings antworten</p>
                <p className="mt-1">Sobald Termine angelegt sind, kannst du dich direkt an- oder abmelden.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </main>
  );
}
