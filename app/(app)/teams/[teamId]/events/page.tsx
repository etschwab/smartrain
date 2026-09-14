import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, CopyPlus, MapPin, Trash2 } from "lucide-react";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TeamTabs } from "@/components/team/team-tabs";
import { createEventFromTemplateAction, deleteEventTemplateAction } from "@/lib/actions";
import { managerRoles } from "@/lib/constants";
import { getTeamById, listEventTemplates, listTeamEvents } from "@/lib/data";
import { requireTeamAccess } from "@/lib/supabase-server";
import { formatDateTimeLabel, getEventTypeLabel, isFutureDate } from "@/lib/utils";

type TeamEventsPageProps = { params: Promise<{ teamId: string }> };

export const metadata: Metadata = {
  title: "Trainings & Spiele",
  description: "Alle Termine des Teams sowie gespeicherte Terminvorlagen."
};

export default async function TeamEventsPage({ params }: TeamEventsPageProps) {
  const { teamId } = await params;
  const { supabase, membership } = await requireTeamAccess(teamId, `/teams/${teamId}/events`);
  const canManage = managerRoles.includes(membership.role);
  const [team, events, templates] = await Promise.all([
    getTeamById(supabase, teamId),
    listTeamEvents(supabase, teamId),
    canManage ? listEventTemplates(supabase, teamId) : Promise.resolve([])
  ]);

  if (!team) notFound();

  const upcoming = events.filter((event) => isFutureDate(event.starts_at));
  const past = events.filter((event) => !isFutureDate(event.starts_at)).reverse();

  const eventList = (items: typeof events) => (
    <div className="space-y-3">
      {items.map((event) => (
        <Link key={event.id} href={`/teams/${team.id}/events/${event.id}`} className="block rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-semibold">{event.title}</h3>
                <Badge>{getEventTypeLabel(event.type)}</Badge>
                {event.is_cancelled ? <Badge variant="danger">Abgesagt</Badge> : null}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{formatDateTimeLabel(event.starts_at)}</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{event.location ?? "Ort noch offen"}</p>
            </div>
            <span className="text-sm font-semibold text-primary">Öffnen</span>
          </div>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">Trainings & Events</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{team.name}</h1>
            <p className="mt-3 text-muted-foreground">Alle Termine dieses Teams an einem Ort.</p>
          </div>
          {canManage ? (
            <Button asChild><Link href={`/teams/${team.id}/events/new`}><CalendarPlus className="h-4 w-4" />Neuer Termin</Link></Button>
          ) : null}
        </div>
        <div className="mt-6"><TeamTabs teamId={team.id} /></div>
      </Card>

      {canManage && templates.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Terminvorlagen</h2>
            <p className="mt-1 text-sm text-muted-foreground">Wiederkehrende Termine mit einem Klick erneut anlegen.</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold">{template.name}</h3>
                      <Badge>{getEventTypeLabel(template.type)}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{template.duration_minutes} Minuten{template.location ? ` · ${template.location}` : ""}</p>
                  </div>
                  <form action={deleteEventTemplateAction.bind(null, team.id, template.id)}>
                    <ConfirmSubmit type="submit" variant="ghost" size="icon" aria-label="Vorlage löschen" confirmMessage={`Vorlage „${template.name}“ löschen?`}>
                      <Trash2 className="h-4 w-4" />
                    </ConfirmSubmit>
                  </form>
                </div>
                <form action={createEventFromTemplateAction.bind(null, team.id, template.id)} className="mt-5">
                  <SubmitButton variant="secondary" className="w-full" pendingLabel="Termin wird erstellt...">
                    <CopyPlus className="h-4 w-4" />Nächsten Termin erstellen
                  </SubmitButton>
                </form>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {events.length === 0 ? (
        <EmptyState
          title="Noch keine Trainings oder Events"
          description="Erstelle den ersten Termin für dieses Team."
          action={canManage ? <Button asChild><Link href={`/teams/${team.id}/events/new`}>Termin erstellen</Link></Button> : undefined}
        />
      ) : (
        <>
          <section>
            <h2 className="mb-4 text-xl font-semibold">Bevorstehend</h2>
            {upcoming.length > 0 ? eventList(upcoming) : <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Keine bevorstehenden Termine.</p>}
          </section>
          {past.length > 0 ? (
            <section>
              <h2 className="mb-4 text-xl font-semibold">Vergangen</h2>
              {eventList(past)}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
