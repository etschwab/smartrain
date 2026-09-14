import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarClock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TeamTabs } from "@/components/team/team-tabs";
import { deleteEventAction, toggleEventCancellationAction, updateEventAction } from "@/lib/actions";
import { eventTypeOptions, managerRoles } from "@/lib/constants";
import { getEventById, getTeamById } from "@/lib/data";
import { requireTeamAccess } from "@/lib/supabase-server";
import { formatDateTimeLabel, getEventTypeLabel, toDateTimeLocalValue } from "@/lib/utils";

type EventDetailPageProps = { params: Promise<{ teamId: string; eventId: string }> };

export const metadata: Metadata = {
  title: "Termin",
  description: "Details, Zu-/Absagen und Bearbeitung dieses Termins."
};

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { teamId, eventId } = await params;
  const { supabase, membership } = await requireTeamAccess(teamId, `/teams/${teamId}/events/${eventId}`);
  const [team, event] = await Promise.all([getTeamById(supabase, teamId), getEventById(supabase, eventId)]);

  if (!team || !event || event.team_id !== team.id) notFound();

  const canManage = managerRoles.includes(membership.role);

  return (
    <div className="space-y-8">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{getEventTypeLabel(event.type)}</Badge>
              {event.is_cancelled ? <Badge variant="danger">Abgesagt</Badge> : null}
            </div>
            <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">{event.title}</h1>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><CalendarClock className="h-4 w-4" />{formatDateTimeLabel(event.starts_at)}</p>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{event.location ?? "Ort noch offen"}</p>
            </div>
          </div>
          <p className="max-w-lg text-sm leading-6 text-muted-foreground">{event.description ?? "Keine Beschreibung hinterlegt."}</p>
        </div>
        <div className="mt-6"><TeamTabs teamId={team.id} /></div>
      </Card>

      {canManage ? (
        <Card className="p-6 sm:p-8">
          <div>
            <p className="section-kicker">Termin bearbeiten</p>
            <h2 className="mt-2 text-2xl font-semibold">Details</h2>
          </div>
          <form action={updateEventAction.bind(null, team.id, event.id)} className="mt-6 grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">Titel<Input name="title" defaultValue={event.title} required /></label>
              <label className="grid gap-2 text-sm font-semibold">Art<Select name="type" defaultValue={event.type}>{eventTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></label>
              <label className="grid gap-2 text-sm font-semibold">Beginn<Input name="starts_at" type="datetime-local" defaultValue={toDateTimeLocalValue(event.starts_at)} required /></label>
              <label className="grid gap-2 text-sm font-semibold">Ende<Input name="ends_at" type="datetime-local" defaultValue={toDateTimeLocalValue(event.ends_at)} required /></label>
              <label className="grid gap-2 text-sm font-semibold sm:col-span-2">Ort<Input name="location" defaultValue={event.location ?? ""} placeholder="Trainingsplatz, Halle oder Treffpunkt" /></label>
            </div>
            <label className="grid gap-2 text-sm font-semibold">Beschreibung<Textarea name="description" defaultValue={event.description ?? ""} /></label>
            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <ConfirmSubmit formAction={deleteEventAction.bind(null, team.id, event.id)} variant="ghost" confirmMessage="Termin wirklich löschen?">Löschen</ConfirmSubmit>
                <SubmitButton formAction={toggleEventCancellationAction.bind(null, team.id, event.id, !event.is_cancelled)} variant="secondary" pendingLabel="Wird aktualisiert...">
                  {event.is_cancelled ? "Reaktivieren" : "Absagen"}
                </SubmitButton>
              </div>
              <SubmitButton pendingLabel="Wird gespeichert...">Änderungen speichern</SubmitButton>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
