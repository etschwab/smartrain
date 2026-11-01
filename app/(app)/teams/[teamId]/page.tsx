import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, ChevronRight, UserPlus } from "lucide-react";
import { ResponseBadge } from "@/components/events/response-controls";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TeamHeader } from "@/components/team/team-header";
import { managerRoles } from "@/lib/constants";
import { getTeamById, listTeamEvents, listTeamMembersDetailed, listUserResponses } from "@/lib/data";
import { requireTeamAccess } from "@/lib/supabase-server";
import { formatDateTimeLabel, getDisplayName, getEventTypeLabel, getInitials, getRoleLabel, isFutureDate } from "@/lib/utils";

type TeamPageProps = { params: Promise<{ teamId: string }> };

export const metadata: Metadata = {
  title: "Team-Übersicht",
  description: "Nächste Termine und Mitglieder dieses Teams."
};

export default async function TeamOverviewPage({ params }: TeamPageProps) {
  const { teamId } = await params;
  const { supabase, user, membership } = await requireTeamAccess(teamId, `/teams/${teamId}`);
  const [team, members, events] = await Promise.all([
    getTeamById(supabase, teamId),
    listTeamMembersDetailed(supabase, teamId),
    listTeamEvents(supabase, teamId)
  ]);

  if (!team) notFound();

  const canManage = managerRoles.includes(membership.role);
  const upcomingEvents = events.filter((event) => isFutureDate(event.ends_at)).slice(0, 5);
  const responses = await listUserResponses(supabase, user.id, upcomingEvents.map((event) => event.id));
  const activeMembers = members.filter((member) => member.status === "active");

  return (
    <div className="space-y-8">
      <TeamHeader
        team={team}
        role={membership.role}
        action={
          canManage ? (
            <>
              <Button asChild>
                <Link href={`/teams/${team.id}/events/new`}><CalendarPlus className="h-4 w-4" />Termin erstellen</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href={`/teams/${team.id}/members`}><UserPlus className="h-4 w-4" />Einladen</Link>
              </Button>
            </>
          ) : null
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Nächste Termine</h2>
            <Link href={`/teams/${team.id}/events`} className="text-link text-sm">Alle Termine</Link>
          </div>
          {upcomingEvents.length > 0 ? (
            <Card className="divide-y divide-border">
              {upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/teams/${team.id}/events/${event.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {event.title}
                      {event.is_cancelled ? <span className="ml-2 text-sm font-normal text-destructive">Abgesagt</span> : null}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {getEventTypeLabel(event.type)} · {formatDateTimeLabel(event.starts_at)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {event.is_cancelled ? null : <ResponseBadge status={responses.get(event.id)?.status} />}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </span>
                </Link>
              ))}
            </Card>
          ) : (
            <EmptyState
              title="Keine Termine geplant"
              description={canManage ? "Plane das erste Training oder Spiel für dieses Team." : "Sobald ein Coach Termine anlegt, erscheinen sie hier."}
              action={canManage ? <Button asChild size="sm"><Link href={`/teams/${team.id}/events/new`}>Termin erstellen</Link></Button> : undefined}
            />
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">{activeMembers.length} Mitglieder</h2>
            <Link href={`/teams/${team.id}/members`} className="text-link text-sm">Alle</Link>
          </div>
          <Card className="divide-y divide-border">
            {activeMembers.slice(0, 8).map((member) => {
              const name = getDisplayName(member.profile?.full_name, member.profile?.email);
              return (
                <div key={member.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-[0.6875rem] font-semibold">{getInitials(name)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
                  <span className="text-xs text-muted-foreground">{getRoleLabel(member.role)}</span>
                </div>
              );
            })}
          </Card>
        </section>
      </div>
    </div>
  );
}
