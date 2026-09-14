import type { Metadata } from "next";
import Link from "next/link";
import { Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";
import { updateProfileAction } from "@/lib/actions";
import { requireProfile } from "@/lib/supabase-server";
import { formatDateLabel, getDisplayName } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Profil",
  description: "Deine Kontodaten und Anzeigeeinstellungen."
};

export default async function ProfilePage() {
  const { user, profile } = await requireProfile("/profile");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">Profil</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{getDisplayName(profile.full_name, profile.email)}</h1>
            <p className="mt-3 text-muted-foreground">Nur die wichtigsten Angaben für deinen Smartrain-Account.</p>
          </div>
          <Button asChild variant="secondary"><Link href="/dashboard">Zur Übersicht</Link></Button>
        </div>
      </Card>

      <Card className="p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Name bearbeiten</h2>
        <form action={updateProfileAction} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="grid flex-1 gap-2 text-sm font-semibold">
            Anzeigename
            <Input name="full_name" defaultValue={profile.full_name ?? ""} placeholder="Dein Name" />
          </label>
          <SubmitButton pendingLabel="Wird gespeichert...">Speichern</SubmitButton>
        </form>
      </Card>

      <Card className="p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Account</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-background/70 p-4">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <p className="mt-3 text-xs text-muted-foreground">E-Mail</p>
            <p className="mt-1 truncate font-semibold">{profile.email ?? user.email ?? "Keine E-Mail"}</p>
          </div>
          <div className="rounded-xl border border-border bg-background/70 p-4">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <p className="mt-3 text-xs text-muted-foreground">Account erstellt</p>
            <p className="mt-1 font-semibold">{formatDateLabel(profile.created_at)}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
