import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarPlus, MapPin, Plus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { managerRoles, MAX_OWNED_TEAMS } from "@/lib/constants";
import { getCoreDashboardData } from "@/lib/data";
import { requireProfile } from "@/lib/supabase-server";
import { formatDateTimeLabel, formatEventCountdown, getDisplayName, getEventTypeLabel, getRoleLabel } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Deine Teams, das nächste Training und offene Aufgaben auf einen Blick."
};

export default async function DashboardPage() {
  const { supabase, user, profile } = await requireProfile("/dashboard");
  const dashboard = await getCoreDashboardData(supabase, user.id);
  const managedTeam = dashboard.teams.find((team) => managerRoles.includes(team.membership.role)) ?? null;
  const ownedTeams = dashboard.teams.filter((team) => team.membership.role === "owner");
  const nextEvent = dashboard.upcomingEvents[0] ?? null;
  const canCreateTeam = ownedTeams.length < MAX_OWNED_TEAMS;

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="border-b border-border/70 pb-6 sm:pb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="section-kicker">Übersicht</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Hallo {getDisplayName(profile.full_name, profile.email)}
            </h1>
            <p className="mt-3 text-muted-foreground">Teams verwalten, Trainings planen und Mitglieder einladen.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {managedTeam ? (
              <Button asChild>
                <Link href={`/teams/${managedTeam.id}/events/new`}>
                  <CalendarPlus className="h-4 w-4" />
                  Training oder Event erstellen
                </Link>
              </Button>
            ) : null}
            {canCreateTeam ? (
              <Button asChild variant="secondary">
                <Link href="/teams/new">
                  <Plus className="h-4 w-4" />
                  Team erstellen
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {dashboard.teams.length === 0 ? (
        <EmptyState
          title="Noch kein Team"
          description="Erstelle ein Team oder tritt über einen Einladungslink bei. Danach kannst du direkt Trainings und Events planen."
          action={
            canCreateTeam ? (
              <Button asChild>
                <Link href="/teams/new">Erstes Team erstellen</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <section className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="section-kicker">Teams</p>
                <h2 className="mt-2 text-2xl font-semibold">Deine Teams</h2>
              </div>
              <Button asChild variant="secondary" size="sm">
                <Link href="/teams">Alle Teams</Link>
              </Button>
            </div>
            <div className="mt-5 space-y-3">
              {dashboard.teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/teams/${team.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-transparent bg-background/45 p-4 transition-colors hover:border-border/70 hover:bg-muted/50"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted">
                      <Users className="h-5 w-5 text-primary" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{team.name}</span>
                      <span className="block text-sm text-muted-foreground">{team.sport} · {team.season}</span>
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <Badge variant="outline">{getRoleLabel(team.membership.role)}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </span>
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <p className="section-kicker">Nächster Termin</p>
            {nextEvent ? (
              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{getEventTypeLabel(nextEvent.type)}</Badge>
                  <Badge variant="outline">{nextEvent.team?.name ?? "Team"}</Badge>
                </div>
                <h2 className="mt-5 text-2xl font-semibold">{nextEvent.title}</h2>
                <p className="mt-2 text-sm font-semibold text-primary">{formatEventCountdown(nextEvent.starts_at)}</p>
                <p className="mt-4 text-muted-foreground">{formatDateTimeLabel(nextEvent.starts_at)}</p>
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {nextEvent.location ?? "Ort noch offen"}
                </p>
                <Button asChild className="mt-6 w-full">
                  <Link href={`/teams/${nextEvent.team_id}/events/${nextEvent.id}`}>Termin öffnen</Link>
                </Button>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                Noch kein Training oder Event geplant.
              </div>
            )}
          </Card>
        </section>
      )}
    </div>
  );
}
