import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, ChevronRight, CopyPlus, Trash2 } from "lucide-react";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { ResponseBadge } from "@/components/events/response-controls";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TeamHeader } from "@/components/team/team-header";
import { createEventFromTemplateAction, deleteEventTemplateAction } from "@/lib/actions";
import { managerRoles } from "@/lib/constants";
import { getTeamById, listEventTemplates, listTeamEvents, listUserResponses } from "@/lib/data";
import { requireTeamAccess } from "@/lib/supabase-server";
import { formatDateTimeLabel, formatTimeLabel, getEventTypeLabel, isFutureDate } from "@/lib/utils";
import type { EventRecord, EventResponseRecord } from "@/lib/types";

type TeamEventsPageProps = { params: Promise<{ teamId: string }> };

export const metadata: Metadata = {
  title: "Termine",
  description: "Alle Trainings, Spiele und Events des Teams."
};

function EventList({ teamId, events, responses, showResponse }: { teamId: string; events: EventRecord[]; responses: Map<string, EventResponseRecord>; showResponse: boolean }) {
  return (
    <Card className="divide-y divide-border">
      {events.map((event) => (
        <Link
          key={event.id}
          href={`/teams/${teamId}/events/${event.id}`}
          className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50"
        >
          <span className="min-w-0">
            <span className={event.is_cancelled ? "block truncate font-medium text-muted-foreground line-through" : "block truncate font-medium"}>
              {event.title}
            </span>
            <span className="block text-sm text-muted-foreground">
              {getEventTypeLabel(event.type)} · {formatDateTimeLabel(event.starts_at)}–{formatTimeLabel(event.ends_at)}
              {event.location ? ` · ${event.location}` : ""}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {event.is_cancelled ? (
              <span className="text-sm text-destructive">Abgesagt</span>
            ) : showResponse ? (
              <ResponseBadge status={responses.get(event.id)?.status} />
            ) : null}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </span>
        </Link>
      ))}
    </Card>
  );
}

export default async function TeamEventsPage({ params }: TeamEventsPageProps) {
  const { teamId } = await params;
  const { supabase, user, membership } = await requireTeamAccess(teamId, `/teams/${teamId}/events`);
  const canManage = managerRoles.includes(membership.role);
  const [team, events, templates] = await Promise.all([
    getTeamById(supabase, teamId),
    listTeamEvents(supabase, teamId),
    canManage ? listEventTemplates(supabase, teamId) : Promise.resolve([])
  ]);

  if (!team) notFound();

  const upcoming = events.filter((event) => isFutureDate(event.ends_at));
  const past = events.filter((event) => !isFutureDate(event.ends_at)).reverse().slice(0, 20);
  const responses = await listUserResponses(supabase, user.id, upcoming.map((event) => event.id));

  return (
    <div className="space-y-8">
      <TeamHeader
        team={team}
        role={membership.role}
        action={
          canManage ? (
            <Button asChild>
              <Link href={`/teams/${team.id}/events/new`}><CalendarPlus className="h-4 w-4" />Termin erstellen</Link>
            </Button>
          ) : null
        }
      />

      {canManage && templates.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Vorlagen</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{template.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {getEventTypeLabel(template.type)} · {formatTimeLabel(template.source_starts_at)} · {template.duration_minutes} Min.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <form action={createEventFromTemplateAction.bind(null, team.id, template.id)}>
                    <SubmitButton variant="secondary" size="sm" pendingLabel="...">
                      <CopyPlus className="h-4 w-4" />Nächster
                    </SubmitButton>
                  </form>
                  <form action={deleteEventTemplateAction.bind(null, team.id, template.id)}>
                    <ConfirmSubmit type="submit" variant="ghost" size="icon" aria-label="Vorlage löschen" confirmMessage={`Vorlage „${template.name}“ löschen?`}>
                      <Trash2 className="h-4 w-4" />
                    </ConfirmSubmit>
                  </form>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {events.length === 0 ? (
        <EmptyState
          title="Noch keine Termine"
          description={canManage ? "Erstelle das erste Training oder Spiel." : "Sobald ein Coach Termine anlegt, erscheinen sie hier."}
          action={canManage ? <Button asChild><Link href={`/teams/${team.id}/events/new`}>Termin erstellen</Link></Button> : undefined}
        />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Bevorstehend</h2>
            {upcoming.length > 0 ? (
              <EventList teamId={team.id} events={upcoming} responses={responses} showResponse />
            ) : (
              <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Keine bevorstehenden Termine.</p>
            )}
          </section>
          {past.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Vergangen</h2>
              <EventList teamId={team.id} events={past} responses={responses} showResponse={false} />
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
