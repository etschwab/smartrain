"use server";

import { redirect } from "next/navigation";
import { runAction } from "@/lib/action-errors";
import { requireProfile } from "@/lib/supabase-server";
import { getUserFacingSupabaseError, isRecoverableSetupError } from "@/lib/supabase-errors";

function getString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function getNullableString(formData: FormData, name: string) {
  const value = getString(formData, name);
  return value.length > 0 ? value : null;
}

export async function updateProfileAction(formData: FormData) {
  await runAction("/profile", () => updateProfile(formData));
}

async function updateProfile(formData: FormData) {
  const { supabase, user } = await requireProfile("/profile");
  const payload = {
    id: user.id,
    full_name: getNullableString(formData, "full_name"),
    email: user.email ?? null
  };

  const payloads = [
    payload,
    {
      id: user.id,
      full_name: payload.full_name,
      email: payload.email
    },
    {
      id: user.id,
      full_name: payload.full_name
    }
  ] as const;

  for (const entry of payloads) {
    const { error } = await supabase.from("profiles").upsert(entry, { onConflict: "id" });

    if (!error) {
      redirect("/profile?toast=profile-updated");
    }

    if (!isRecoverableSetupError(error)) {
      throw new Error(getUserFacingSupabaseError(error, "Das Profil konnte nicht gespeichert werden."));
    }
  }

  redirect("/profile?toast=profile-updated");
}
