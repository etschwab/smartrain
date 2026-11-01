import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { ResponseControls } from "@/components/events/response-controls";
import { SubmitButton } from "@/components/forms/submit-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { deleteEventAction, toggleEventCancellationAction, updateEventAction } from "@/lib/actions";
import { eventTypeOptions, managerRoles } from "@/lib/constants";
import { getEventById, getTeamById, listEventResponses, listTeamMembersDetailed } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase-admin";
import { requireTeamAccess } from "@/lib/supabase-server";
import { cn, formatDateTimeLabel, formatTimeLabel, getDisplayName, getEventTypeLabel, getInitials, isFutureDate, toDateTimeLocalValue } from "@/lib/utils";
import type { ResponseStatus } from "@/lib/types";

type EventDetailPageProps = { params: Promise<{ teamId: string; eventId: string }> };

export const metadata: Metadata = {
  title: "Termin",
  description: "Details, Zu- und Absagen für diesen Termin."
};

const groups: Array<{ key: ResponseStatus | "open"; label: string; dot: string }> = [
  { key: "yes", label: "Zugesagt", dot: "bg-success" },
  { key: "maybe", label: "Vielleicht", dot: "bg-warning" },
  { key: "no", label: "Abgesagt", dot: "bg-destructive" },
  { key: "open", label: "Noch keine Antwort", dot: "bg-muted-foreground/40" }
];

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { teamId, eventId } = await params;
  const eventPath = `/teams/${teamId}/events/${eventId}`;
  const { supabase, user, membership } = await requireTeamAccess(teamId, eventPath);
  const readSupabase = createAdminClient() ?? supabase;
  const [team, event, responses, members] = await Promise.all([
    getTeamById(supabase, teamId),
    getEventById(supabase, eventId),
    listEventResponses(supabase, eventId),
    listTeamMembersDetailed(readSupabase, teamId)
  ]);

  if (!team || !event || event.team_id !== team.id) notFound();

  const canManage = managerRoles.includes(membership.role);
  const isOpen = !event.is_cancelled && isFutureDate(event.ends_at);
  const ownResponse = responses.find((response) => response.user_id === user.id) ?? null;
  const responseByUser = new Map(responses.map((response) => [response.user_id, response]));
  const participants = members
    .filter((member) => member.status === "active")
    .map((member) => ({
      id: member.id,
      name: getDisplayName(member.profile?.full_name, member.profile?.email),
      isSelf: member.user_id === user.id,
      response: responseByUser.get(member.user_id) ?? null
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/teams/${team.id}/events`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {team.name}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge>{getEventTypeLabel(event.type)}</Badge>
          {event.is_cancelled ? <Badge variant="danger">Abgesagt</Badge> : null}
        </div>
        <h1 className={cn("mt-2 text-2xl font-semibold tracking-tight sm:text-3xl", event.is_cancelled && "text-muted-foreground line-through")}>
          {event.title}
        </h1>
        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          <p className="flex items-center gap-2"><CalendarClock className="h-4 w-4" />{formatDateTimeLabel(event.starts_at)}–{formatTimeLabel(event.ends_at)}</p>
          <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{event.location ?? "Ort noch offen"}</p>
        </div>
        {event.description ? <p className="mt-4 max-w-2xl whitespace-pre-line text-sm">{event.description}</p> : null}
      </div>

      {isOpen ? (
        <Card className="p-5 sm:p-6">
          <h2 className="font-semibold">Bist du dabei?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {ownResponse ? "Du kannst deine Antwort jederzeit ändern." : "Gib deinem Coach kurz Bescheid."}
          </p>
          <div className="mt-4">
            <ResponseControls teamId={team.id} eventId={event.id} response={ownResponse} returnPath={eventPath} withComment />
          </div>
        </Card>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          {event.is_cancelled ? "Dieser Termin wurde abgesagt." : "Dieser Termin ist vorbei. Antworten sind nicht mehr möglich."}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Teilnahme · {participants.filter((person) => person.response?.status === "yes").length} von {participants.length} dabei
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((group) => {
            const people = participants.filter((person) => (person.response?.status ?? "open") === group.key);
            if (people.length === 0) return null;
            return (
              <Card key={group.key} className="p-4">
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <span className={cn("h-2 w-2 rounded-full", group.dot)} />
                  {group.label}
                  <span className="text-muted-foreground">{people.length}</span>
                </h3>
                <ul className="mt-3 space-y-2">
                  {people.map((person) => (
                    <li key={person.id} className="flex items-start gap-2.5 text-sm">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-[0.625rem] font-semibold">{getInitials(person.name)}</span>
                      <span className="min-w-0 pt-0.5">
                        <span className="block truncate">{person.name}{person.isSelf ? <span className="text-muted-foreground"> (du)</span> : null}</span>
                        {person.response?.comment ? <span className="block text-muted-foreground">„{person.response.comment}“</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </section>

      {canManage ? (
        <details className="group rounded-xl border border-border bg-card">
          <summary className="cursor-pointer list-none px-5 py-4 font-semibold marker:hidden">
            Termin bearbeiten
            <span className="ml-2 text-sm font-normal text-muted-foreground">Coach / Owner</span>
          </summary>
          <form action={updateEventAction.bind(null, team.id, event.id)} className="grid gap-5 border-t border-border p-5">
            <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
              <Field label="Titel"><Input name="title" defaultValue={event.title} required maxLength={120} /></Field>
              <Field label="Art">
                <Select name="type" defaultValue={event.type}>
                  {eventTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Beginn"><Input name="starts_at" type="datetime-local" defaultValue={toDateTimeLocalValue(event.starts_at)} required /></Field>
              <Field label="Ende"><Input name="ends_at" type="datetime-local" defaultValue={toDateTimeLocalValue(event.ends_at)} required /></Field>
            </div>
            <Field label="Ort"><Input name="location" defaultValue={event.location ?? ""} placeholder="Trainingsplatz, Halle oder Treffpunkt" maxLength={160} /></Field>
            <Field label="Beschreibung"><Textarea name="description" defaultValue={event.description ?? ""} maxLength={2000} /></Field>
            <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <SubmitButton formAction={toggleEventCancellationAction.bind(null, team.id, event.id, !event.is_cancelled)} variant="secondary" pendingLabel="...">
                  {event.is_cancelled ? "Wieder aktivieren" : "Absagen"}
                </SubmitButton>
                <ConfirmSubmit formAction={deleteEventAction.bind(null, team.id, event.id)} variant="ghost" className="text-destructive hover:bg-destructive/10" confirmMessage="Termin wirklich löschen? Alle Antworten gehen verloren.">
                  Löschen
                </ConfirmSubmit>
              </div>
              <SubmitButton pendingLabel="Wird gespeichert...">Änderungen speichern</SubmitButton>
            </div>
          </form>
        </details>
      ) : null}
    </div>
  );
}
