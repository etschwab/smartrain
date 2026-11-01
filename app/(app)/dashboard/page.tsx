import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, ChevronRight, MapPin, Plus } from "lucide-react";
import { ResponseBadge, ResponseControls } from "@/components/events/response-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { managerRoles, MAX_OWNED_TEAMS } from "@/lib/constants";
import { getCoreDashboardData } from "@/lib/data";
import { requireProfile } from "@/lib/supabase-server";
import { formatDateTimeLabel, formatEventCountdown, getDisplayName, getEventTypeLabel, getRoleLabel, getTeamAccentColor } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Übersicht",
  description: "Deine nächsten Termine und Teams auf einen Blick."
};

export default async function DashboardPage() {
  const { supabase, user, profile } = await requireProfile("/dashboard");
  const dashboard = await getCoreDashboardData(supabase, user.id);
  const managedTeam = dashboard.teams.find((team) => managerRoles.includes(team.membership.role)) ?? null;
  const ownedTeams = dashboard.teams.filter((team) => team.membership.role === "owner");
  const canCreateTeam = ownedTeams.length < MAX_OWNED_TEAMS;
  const [nextEvent, ...laterEvents] = dashboard.upcomingEvents;
  const firstName = getDisplayName(profile.full_name, profile.email).split(" ")[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Hallo ${firstName}`}
        description={nextEvent ? "Das steht bei deinen Teams als Nächstes an." : "Hier siehst du deine nächsten Termine."}
        action={
          managedTeam ? (
            <Button asChild>
              <Link href={`/teams/${managedTeam.id}/events/new`}>
                <CalendarPlus className="h-4 w-4" />
                Termin erstellen
              </Link>
            </Button>
          ) : null
        }
      />

      {dashboard.teams.length === 0 ? (
        <EmptyState
          title="Noch kein Team"
          description="Erstelle ein Team oder öffne den Einladungslink, den du von deinem Coach bekommen hast."
          action={
            canCreateTeam ? (
              <Button asChild>
                <Link href="/teams/new"><Plus className="h-4 w-4" />Team erstellen</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Nächster Termin</h2>
            {nextEvent ? (
              <Card className="p-5 sm:p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <Link href={`/teams/${nextEvent.team_id}/events/${nextEvent.id}`} className="group min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <Badge>{getEventTypeLabel(nextEvent.type)}</Badge>
                      <span>{nextEvent.team?.name ?? "Team"}</span>
                    </div>
                    <h3 className="mt-3 text-xl font-semibold group-hover:underline group-hover:underline-offset-4">{nextEvent.title}</h3>
                    <p className="mt-1 text-sm">
                      {formatDateTimeLabel(nextEvent.starts_at)}
                      <span className="text-muted-foreground"> · {formatEventCountdown(nextEvent.starts_at)}</span>
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {nextEvent.location ?? "Ort noch offen"}
                    </p>
                  </Link>
                  <div className="w-full md:w-80">
                    <p className="mb-2 text-sm text-muted-foreground">Bist du dabei?</p>
                    <ResponseControls
                      teamId={nextEvent.team_id}
                      eventId={nextEvent.id}
                      response={nextEvent.response}
                      returnPath="/dashboard"
                    />
                  </div>
                </div>
              </Card>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                In den nächsten 30 Tagen ist nichts geplant.
              </p>
            )}
          </section>

          {laterEvents.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Danach</h2>
              <Card className="divide-y divide-border">
                {laterEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/teams/${event.team_id}/events/${event.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{event.title}</span>
                      <span className="block text-sm text-muted-foreground">
                        {formatDateTimeLabel(event.starts_at)} · {event.team?.name ?? "Team"}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <ResponseBadge status={event.response?.status} />
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </span>
                  </Link>
                ))}
              </Card>
            </section>
          ) : null}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">Deine Teams</h2>
              {canCreateTeam ? (
                <Link href="/teams/new" className="text-link text-sm">Neues Team</Link>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {dashboard.teams.map((team) => (
                <Link key={team.id} href={`/teams/${team.id}`}>
                  <Card className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/50">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: getTeamAccentColor(team.theme_color) }} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{team.name}</span>
                        <span className="block text-sm text-muted-foreground">{team.sport} · {getRoleLabel(team.membership.role)}</span>
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
