import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/forms/submit-button";
import { signOutAction, updateProfileAction } from "@/lib/actions";
import { requireProfile } from "@/lib/supabase-server";
import { formatDateLabel } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Profil",
  description: "Deine Kontodaten."
};

export default async function ProfilePage() {
  const { user, profile } = await requireProfile("/profile");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Profil" />

      <Card className="p-5 sm:p-6">
        <form action={updateProfileAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Anzeigename" hint="So sehen dich die anderen im Team." className="flex-1">
            <Input name="full_name" defaultValue={profile.full_name ?? ""} placeholder="Vorname Nachname" maxLength={80} />
          </Field>
          <SubmitButton pendingLabel="Wird gespeichert..." className="sm:mb-5">Speichern</SubmitButton>
        </form>
      </Card>

      <Card className="divide-y divide-border">
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
          <span className="text-muted-foreground">E-Mail</span>
          <span className="truncate font-medium">{profile.email ?? user.email ?? "Keine E-Mail"}</span>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
          <span className="text-muted-foreground">Dabei seit</span>
          <span className="font-medium">{formatDateLabel(profile.created_at)}</span>
        </div>
      </Card>

      <form action={signOutAction}>
        <Button type="submit" variant="secondary" className="w-full sm:w-auto">
          <LogOut className="h-4 w-4" />
          Abmelden
        </Button>
      </form>
    </div>
  );
}
