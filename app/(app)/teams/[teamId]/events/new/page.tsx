import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";
import { TeamTabs } from "@/components/team/team-tabs";
import { createEventAction } from "@/lib/actions";
import { eventTypeOptions } from "@/lib/constants";
import { getTeamById } from "@/lib/data";
import { requireTeamManager } from "@/lib/supabase-server";

type NewEventPageProps = {
  params: Promise<{
    teamId: string;
  }>;
};

export const metadata: Metadata = {
  title: "Termin erstellen",
  description: "Plane ein neues Training, Spiel oder Event für dein Team."
};

export default async function NewEventPage({ params }: NewEventPageProps) {
  const { teamId } = await params;
  const { supabase } = await requireTeamManager(teamId, `/teams/${teamId}/events/new`);
  const team = await getTeamById(supabase, teamId);

  if (!team) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl page-stack">
      <Card className="p-8">
        <p className="section-kicker">Neuer Termin</p>
        <h1 className="mt-2 text-4xl font-semibold">{team.name}</h1>
        <p className="mt-3 text-muted-foreground">Plane ein Training oder einen anderen Teamtermin.</p>
        <div className="mt-6">
          <TeamTabs teamId={team.id} />
        </div>
      </Card>

      <Card className="p-8">
        <form action={createEventAction.bind(null, team.id)} className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input name="title" placeholder="Titel des Termins" required />
            <Select name="type" defaultValue="training">
              {eventTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Input name="starts_at" type="datetime-local" required />
            <Input name="ends_at" type="datetime-local" required />
            <Input name="location" placeholder="Ort" />
            <label className="grid gap-2 text-sm font-semibold">
              Wöchentliche Wiederholungen
              <Input name="recurrence_count" type="number" min="1" max="52" defaultValue="1" />
            </label>
          </div>
          <Textarea name="description" placeholder="Beschreibung, Treffpunkt oder Zusatzinfos" />
          <div className="grid gap-4 rounded-xl border border-border bg-muted/25 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
            <input id="save_as_template" name="save_as_template" type="checkbox" value="yes" className="h-5 w-5 accent-primary" />
            <div>
              <label htmlFor="save_as_template" className="font-semibold">Als Vorlage speichern</label>
              <p className="mt-1 text-sm text-muted-foreground">Gleiche Uhrzeit, Dauer und Angaben später mit einem Klick erneut verwenden.</p>
            </div>
            <div className="sm:col-start-2">
              <Input name="template_name" placeholder="Vorlagenname, z. B. Dienstagstraining" />
            </div>
          </div>
          <div className="flex justify-end">
            <SubmitButton pendingLabel="Termin wird erstellt...">Termin speichern</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
