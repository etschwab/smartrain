import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
    <div className="space-y-6 sm:space-y-8">
      <section className="border-b border-border/70 pb-6 sm:pb-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-kicker">Teams</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Deine Teams</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Rollen, Einladungen, Termine und Aufgaben bleiben sauber pro Mannschaft getrennt.
            </p>
          </div>
          {canCreateTeam ? (
            <Button asChild>
              <Link href="/teams/new">
                <Plus className="h-4 w-4" />
                Neues Team
              </Link>
            </Button>
          ) : (
            <Button variant="secondary" disabled>
              {ownedTeams.length}/{MAX_OWNED_TEAMS} Teams erreicht
            </Button>
          )}
        </div>
      </section>

      {teams.length === 0 ? (
        <EmptyState
          title="Noch kein Team vorhanden"
          description="Erstelle dein erstes Team und starte direkt mit Mitgliedern, Einladungen und Trainings."
          action={
            <Button asChild>
              <Link href="/teams/new">Erstes Team erstellen</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => {
            const teamAccent = getTeamAccentColor(team.theme_color);

            return (
              <Card key={team.id} className="overflow-hidden p-5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-primary/25">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div
                      className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: teamAccent }}
                    >
                      <Users className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-semibold">{team.name}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {team.sport} · Saison {team.season}
                    </p>
                  </div>
                  <Badge variant="outline">{getRoleLabel(team.membership.role)}</Badge>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: teamAccent }} />
                    {getRoleLabel(team.membership.role)}
                  </span>
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/teams/${team.id}`}>Öffnen</Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
