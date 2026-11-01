import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { MAX_OWNED_TEAMS } from "@/lib/constants";
import { listUserTeams } from "@/lib/data";
import { requireProfile } from "@/lib/supabase-server";
import { getRoleLabel, getTeamAccentColor } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Meine Teams",
  description: "Alle Teams, in denen du Mitglied oder Owner bist."
};

export default async function TeamsPage() {
  const { supabase, user } = await requireProfile("/teams");
  const teams = await listUserTeams(supabase, user.id);
  const ownedTeams = teams.filter((team) => team.membership.role === "owner");
  const canCreateTeam = ownedTeams.length < MAX_OWNED_TEAMS;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teams"
        description={canCreateTeam ? undefined : `Du besitzt bereits ${ownedTeams.length} von ${MAX_OWNED_TEAMS} möglichen Teams.`}
        action={
          canCreateTeam ? (
            <Button asChild>
              <Link href="/teams/new"><Plus className="h-4 w-4" />Neues Team</Link>
            </Button>
          ) : null
        }
      />

      {teams.length === 0 ? (
        <EmptyState
          title="Noch kein Team"
          description="Erstelle dein erstes Team und lade danach Spieler, Eltern und Coaches per Link ein."
          action={
            canCreateTeam ? (
              <Button asChild>
                <Link href="/teams/new">Team erstellen</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="divide-y divide-border">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/teams/${team.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: getTeamAccentColor(team.theme_color) }} />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{team.name}</span>
                  <span className="block text-sm text-muted-foreground">{team.sport} · Saison {team.season}</span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
                {getRoleLabel(team.membership.role)}
                <ChevronRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
