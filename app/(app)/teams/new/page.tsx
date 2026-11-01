import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/forms/submit-button";
import { createTeamAction } from "@/lib/actions";
import { MAX_OWNED_TEAMS, teamColorOptions } from "@/lib/constants";
import { listUserTeams } from "@/lib/data";
import { requireProfile } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Team erstellen",
  description: "Lege ein neues Team an und lade danach die Mitglieder ein."
};

export default async function NewTeamPage() {
  const { supabase, user } = await requireProfile("/teams/new");
  const teams = await listUserTeams(supabase, user.id);
  const ownedTeams = teams.filter((team) => team.membership.role === "owner");

  if (ownedTeams.length >= MAX_OWNED_TEAMS) {
    redirect("/teams?toast=team-limit-reached");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Neues Team"
        description="Danach kannst du direkt Mitglieder per Link einladen und Termine planen."
      />

      <Card className="p-5 sm:p-6">
        <form action={createTeamAction} className="grid gap-5">
          <Field label="Teamname">
            <Input name="name" placeholder="z. B. U17 Frauen" required maxLength={80} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Sportart">
              <Input name="sport" placeholder="z. B. Fussball" required maxLength={60} />
            </Field>
            <Field label="Saison">
              <Input name="season" placeholder="z. B. 2026/27" required maxLength={40} />
            </Field>
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-sm font-medium">Teamfarbe</legend>
            <div className="flex flex-wrap gap-2">
              {teamColorOptions.map((color, index) => (
                <label key={color} className="cursor-pointer">
                  <input type="radio" name="theme_color" value={color} defaultChecked={index === 0} className="peer sr-only" />
                  <span
                    className="block h-8 w-8 rounded-full ring-offset-2 ring-offset-card peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
                    style={{ backgroundColor: color }}
                  />
                  <span className="sr-only">Farbe {color}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex justify-end gap-2 border-t border-border pt-5">
            <Button asChild variant="ghost">
              <Link href="/teams">Abbrechen</Link>
            </Button>
            <SubmitButton pendingLabel="Wird erstellt...">Team erstellen</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
