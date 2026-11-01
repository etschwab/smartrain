import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";
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
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader kicker={team.name} title="Neuer Termin" />

      <Card className="p-5 sm:p-6">
        <form action={createEventAction.bind(null, team.id)} className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
            <Field label="Titel">
              <Input name="title" placeholder="z. B. Training" required maxLength={120} />
            </Field>
            <Field label="Art">
              <Select name="type" defaultValue="training">
                {eventTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Beginn">
              <Input name="starts_at" type="datetime-local" required />
            </Field>
            <Field label="Ende">
              <Input name="ends_at" type="datetime-local" required />
            </Field>
          </div>
          <Field label="Ort">
            <Input name="location" placeholder="Trainingsplatz, Halle oder Treffpunkt" maxLength={160} />
          </Field>
          <Field label="Beschreibung">
            <Textarea name="description" placeholder="Treffpunkt, Material oder Zusatzinfos" maxLength={2000} />
          </Field>

          <details className="group rounded-lg border border-border">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium marker:hidden">
              Wiederholen oder als Vorlage speichern
              <span className="ml-1 text-muted-foreground group-open:hidden">(optional)</span>
            </summary>
            <div className="grid gap-5 border-t border-border p-4">
              <Field label="Anzahl Wochen" hint="1 = nur dieser Termin. Bei z. B. 10 wird der Termin 10 Wochen lang wöchentlich angelegt.">
                <Input name="recurrence_count" type="number" min="1" max="52" defaultValue="1" className="w-28" />
              </Field>
              <label className="flex items-start gap-3 text-sm">
                <input name="save_as_template" type="checkbox" value="yes" className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring" />
                <span>
                  <span className="font-medium">Als Vorlage speichern</span>
                  <span className="block text-muted-foreground">Später mit einem Klick den nächsten Termin mit gleicher Uhrzeit anlegen.</span>
                </span>
              </label>
              <Field label="Name der Vorlage">
                <Input name="template_name" placeholder="z. B. Dienstagstraining" maxLength={80} />
              </Field>
            </div>
          </details>

          <div className="flex justify-end gap-2 border-t border-border pt-5">
            <Button asChild variant="ghost">
              <Link href={`/teams/${team.id}/events`}>Abbrechen</Link>
            </Button>
            <SubmitButton pendingLabel="Wird gespeichert...">Termin speichern</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
