import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";
import { createTeamAction } from "@/lib/actions";
import { MAX_OWNED_TEAMS, teamColorOptions } from "@/lib/constants";
import { listUserTeams } from "@/lib/data";
import { requireProfile } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Team erstellen",
  description: "Lege einen neuen Teamraum an und lade dein Team ein."
};

export default async function NewTeamPage() {
  const { supabase, user } = await requireProfile("/teams/new");
  const teams = await listUserTeams(supabase, user.id);
  const ownedTeams = teams.filter((team) => team.membership.role === "owner");

  if (ownedTeams.length >= MAX_OWNED_TEAMS) {
    redirect("/teams?toast=team-limit-reached");
  }

  return (
    <div className="mx-auto max-w-5xl page-stack">
      <Card className="overflow-hidden p-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr,1.1fr] lg:items-start">
          <div className="space-y-4">
            <p className="section-kicker">Neues Team</p>
            <h1 className="text-4xl font-semibold">Lege einen neuen Teamraum an.</h1>
            <p className="text-muted-foreground">
              Name, Sportart, Saison und Grundfarbe bilden die Basis für euren gemeinsamen Teambereich mit Einladungen,
              Trainings und Rückmeldungen.
            </p>
            <div className="rounded-none border border-border bg-background/70 p-5 text-sm text-muted-foreground">
              <div className="mb-3 flex items-center gap-2 text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-semibold">Was direkt danach möglich ist</span>
              </div>
              <p>Mitglieder einladen, Termine planen, Aufgaben verteilen und auf Trainings Zu- oder Absagen sammeln.</p>
            </div>
            <div className="rounded-none border border-border bg-background/70 p-5 text-sm text-muted-foreground">
              Eigene Teams: {ownedTeams.length}/{MAX_OWNED_TEAMS}
            </div>
          </div>

          <form action={createTeamAction} className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Input name="name" placeholder="Teamname, z. B. U17 Frauen" required />
              <Input name="sport" placeholder="Sportart, z. B. Fussball" required />
              <Input name="season" placeholder="Saison, z. B. 2026/27" required />
              <Input name="logo_url" placeholder="Optional: Logo-URL" />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-semibold">Teamfarbe</label>
              <div className="grid gap-3 sm:grid-cols-2">
                {teamColorOptions.map((color, index) => (
                  <label key={`${color}-${index}`} className="flex cursor-pointer items-center gap-3 rounded-none border border-border bg-background/75 px-4 py-3 text-sm">
                    <input type="radio" name="theme_color" value={color} defaultChecked={index === 0} />
                    <span className="h-5 w-5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="font-medium">{color}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button asChild variant="secondary">
                <Link href="/teams">Abbrechen</Link>
              </Button>
              <SubmitButton pendingLabel="Team wird erstellt...">Team erstellen</SubmitButton>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
