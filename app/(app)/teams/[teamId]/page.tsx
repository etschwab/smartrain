import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TeamTabs } from "@/components/team/team-tabs";
import { managerRoles } from "@/lib/constants";
import { getTeamById, listTeamEvents, listTeamMembersDetailed } from "@/lib/data";
import { requireTeamAccess } from "@/lib/supabase-server";
import { formatDateTimeLabel, getEventTypeLabel, getRoleLabel, isFutureDate } from "@/lib/utils";

type TeamPageProps = { params: Promise<{ teamId: string }> };

export const metadata: Metadata = {
  title: "Team-Übersicht",
  description: "Mitglieder, nächste Termine und offene Aufgaben für dieses Team."
};

export default async function TeamOverviewPage({ params }: TeamPageProps) {
  const { teamId } = await params;
  const { supabase, membership } = await requireTeamAccess(teamId, `/teams/${teamId}`);
  const [team, members, events] = await Promise.all([
    getTeamById(supabase, teamId),
    listTeamMembersDetailed(supabase, teamId),
    listTeamEvents(supabase, teamId)
  ]);

  if (!team) notFound();

  const canManage = managerRoles.includes(membership.role);
  const upcomingEvents = events.filter((event) => isFutureDate(event.starts_at)).slice(0, 5);

  return (
    <div className="space-y-8">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-kicker">{team.sport}</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{team.name}</h1>
            <p className="mt-3 text-muted-foreground">{team.season} · {getRoleLabel(membership.role)}</p>
          </div>
          {canManage ? (
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/teams/${team.id}/events/new`}>
                  <CalendarPlus className="h-4 w-4" />
                  Training oder Event erstellen
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href={`/teams/${team.id}/members`}>
                  <UserPlus className="h-4 w-4" />
                  Mitglieder einladen
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
        <div className="mt-6"><TeamTabs teamId={team.id} /></div>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Trainings & Events</p>
              <h2 className="mt-2 text-2xl font-semibold">Nächste Termine</h2>
            </div>
            <Button asChild variant="secondary" size="sm"><Link href={`/teams/${team.id}/events`}>Alle Termine</Link></Button>
          </div>
          <div className="mt-5 space-y-3">
            {upcomingEvents.length > 0 ? upcomingEvents.map((event) => (
              <Link key={event.id} href={`/teams/${team.id}/events/${event.id}`} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/70 p-4 hover:bg-muted/50">
                <span>
                  <span className="block font-semibold">{event.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{formatDateTimeLabel(event.starts_at)}</span>
                </span>
                <Badge>{getEventTypeLabel(event.type)}</Badge>
              </Link>
            )) : (
              <EmptyState
                title="Noch keine Termine"
                description="Plane das erste Training oder Event für dieses Team."
                action={canManage ? <Button asChild size="sm"><Link href={`/teams/${team.id}/events/new`}>Termin erstellen</Link></Button> : undefined}
              />
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Mitglieder</p>
              <h2 className="mt-2 text-2xl font-semibold">{members.length} im Team</h2>
            </div>
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-5 space-y-3">
            {members.slice(0, 5).map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{member.profile?.full_name ?? member.profile?.email ?? "Unbekannt"}</span>
                  <span className="block text-sm text-muted-foreground">{getRoleLabel(member.role)}</span>
                </span>
              </div>
            ))}
          </div>
          <Button asChild variant="secondary" className="mt-5 w-full"><Link href={`/teams/${team.id}/members`}>Mitglieder verwalten</Link></Button>
        </Card>
      </section>
    </div>
  );
}
