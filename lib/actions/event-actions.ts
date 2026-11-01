"use server";

import { addMinutes } from "date-fns";
import { redirect } from "next/navigation";
import { runAction } from "@/lib/action-errors";
import { requireTeamAccess, requireTeamManager } from "@/lib/supabase-server";
import { getUserFacingSupabaseError, isRecoverableSetupError } from "@/lib/supabase-errors";
import { addWeeksInAppZone, parseDateTimeLocal } from "@/lib/utils";
import type { ResponseStatus } from "@/lib/types";

const responseStatuses: ResponseStatus[] = ["yes", "maybe", "no"];

function getString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function getNullableString(formData: FormData, name: string) {
  const value = getString(formData, name);
  return value.length > 0 ? value : null;
}

function readEventTimes(formData: FormData) {
  const startDate = parseDateTimeLocal(getString(formData, "starts_at"));
  const endDate = parseDateTimeLocal(getString(formData, "ends_at"));

  if (!startDate || !endDate) {
    throw new Error("Bitte gib eine gültige Start- und Endzeit ein.");
  }

  if (endDate.getTime() <= startDate.getTime()) {
    throw new Error("Die Endzeit muss nach der Startzeit liegen.");
  }

  return { startDate, endDate };
}

export async function createEventAction(teamId: string, formData: FormData) {
  await runAction(`/teams/${teamId}/events/new`, async () => {
    const { supabase, user } = await requireTeamManager(teamId, `/teams/${teamId}/events/new`);
    const title = getString(formData, "title");
    const type = getString(formData, "type");

    if (!title || !type) throw new Error("Bitte fülle alle Pflichtfelder aus.");

    const { startDate, endDate } = readEventTimes(formData);
    const recurrenceCount = Math.min(52, Math.max(1, Number.parseInt(getString(formData, "recurrence_count") || "1", 10) || 1));
    const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60_000);

    const payloads = Array.from({ length: recurrenceCount }, (_, index) => {
      const startsAt = addWeeksInAppZone(startDate, index);
      return {
        team_id: teamId,
        title,
        type,
        starts_at: startsAt.toISOString(),
        ends_at: addMinutes(startsAt, durationMinutes).toISOString(),
        location: getNullableString(formData, "location"),
        description: getNullableString(formData, "description"),
        created_by: user.id
      };
    });

    const { data: events, error } = await supabase
      .from("events")
      .insert(payloads)
      .select("id, starts_at")
      .order("starts_at", { ascending: true });

    if (error || !events?.[0]?.id) {
      throw new Error(getUserFacingSupabaseError(error, "Der Termin konnte nicht erstellt werden."));
    }

    let toast = recurrenceCount > 1 ? "events-created" : "event-created";

    if (getString(formData, "save_as_template") === "yes") {
      const templateName = getString(formData, "template_name") || title;
      const { error: templateError } = await supabase.from("event_templates").upsert({
        team_id: teamId,
        name: templateName,
        title,
        type,
        source_starts_at: startDate.toISOString(),
        duration_minutes: durationMinutes,
        location: getNullableString(formData, "location"),
        description: getNullableString(formData, "description"),
        created_by: user.id
      }, { onConflict: "team_id,name" });

      if (templateError) {
        if (isRecoverableSetupError(templateError)) {
          toast = "event-created-template-unavailable";
        } else {
          throw new Error(getUserFacingSupabaseError(templateError, "Die Vorlage konnte nicht gespeichert werden."));
        }
      } else {
        toast = recurrenceCount > 1 ? "events-created-template-saved" : "event-created-template-saved";
      }
    }

    redirect(recurrenceCount > 1 ? `/teams/${teamId}/events?toast=${toast}` : `/teams/${teamId}/events/${events[0].id}?toast=${toast}`);
  });
}

export async function createEventFromTemplateAction(teamId: string, templateId: string) {
  await runAction(`/teams/${teamId}/events`, async () => {
    const { supabase, user } = await requireTeamManager(teamId, `/teams/${teamId}/events`);
    const { data: template, error: templateError } = await supabase.from("event_templates").select("*").eq("id", templateId).eq("team_id", teamId).single();
    if (templateError || !template) throw new Error(getUserFacingSupabaseError(templateError, "Die Vorlage wurde nicht gefunden."));

    let startsAt = new Date(template.source_starts_at);
    while (startsAt.getTime() <= Date.now()) startsAt = addWeeksInAppZone(startsAt, 1);
    for (let attempt = 0; attempt < 104; attempt += 1) {
      const { data: existing, error: existingError } = await supabase.from("events").select("id").eq("team_id", teamId).eq("starts_at", startsAt.toISOString()).maybeSingle();
      if (existingError) throw new Error(getUserFacingSupabaseError(existingError, "Der nächste freie Termin konnte nicht geprüft werden."));
      if (!existing) break;
      startsAt = addWeeksInAppZone(startsAt, 1);
    }

    const { data: event, error } = await supabase.from("events").insert({
      team_id: teamId, title: template.title, type: template.type, starts_at: startsAt.toISOString(),
      ends_at: addMinutes(startsAt, template.duration_minutes).toISOString(), location: template.location,
      description: template.description, created_by: user.id
    }).select("id").single();
    if (error || !event) throw new Error(getUserFacingSupabaseError(error, "Der Termin konnte nicht aus der Vorlage erstellt werden."));
    redirect(`/teams/${teamId}/events/${event.id}?toast=event-from-template-created`);
  });
}

export async function deleteEventTemplateAction(teamId: string, templateId: string) {
  await runAction(`/teams/${teamId}/events`, async () => {
    const { supabase } = await requireTeamManager(teamId, `/teams/${teamId}/events`);
    const { error } = await supabase.from("event_templates").delete().eq("id", templateId).eq("team_id", teamId);
    if (error) throw new Error(getUserFacingSupabaseError(error, "Die Vorlage konnte nicht gelöscht werden."));
    redirect(`/teams/${teamId}/events?toast=event-template-deleted`);
  });
}

export async function updateEventAction(teamId: string, eventId: string, formData: FormData) {
  await runAction(`/teams/${teamId}/events/${eventId}`, async () => {
    const { supabase } = await requireTeamManager(teamId, `/teams/${teamId}/events/${eventId}`);
    const title = getString(formData, "title");
    const type = getString(formData, "type");

    if (!title || !type) throw new Error("Bitte fülle alle Pflichtfelder aus.");

    const { startDate, endDate } = readEventTimes(formData);
    const { error } = await supabase.from("events").update({
      title,
      type,
      starts_at: startDate.toISOString(),
      ends_at: endDate.toISOString(),
      location: getNullableString(formData, "location"),
      description: getNullableString(formData, "description")
    }).eq("id", eventId).eq("team_id", teamId);

    if (error) throw new Error(getUserFacingSupabaseError(error, "Der Termin konnte nicht gespeichert werden."));
    redirect(`/teams/${teamId}/events/${eventId}?toast=event-updated`);
  });
}

export async function deleteEventAction(teamId: string, eventId: string) {
  await runAction(`/teams/${teamId}/events/${eventId}`, async () => {
    const { supabase } = await requireTeamManager(teamId, `/teams/${teamId}/events/${eventId}`);
    const { error } = await supabase.from("events").delete().eq("id", eventId).eq("team_id", teamId);
    if (error) throw new Error(getUserFacingSupabaseError(error, "Der Termin konnte nicht gelöscht werden."));
    redirect(`/teams/${teamId}/events?toast=event-removed`);
  });
}

export async function toggleEventCancellationAction(teamId: string, eventId: string, cancel: boolean) {
  await runAction(`/teams/${teamId}/events/${eventId}`, async () => {
    const { supabase } = await requireTeamManager(teamId, `/teams/${teamId}/events/${eventId}`);
    const { error } = await supabase.from("events").update({ is_cancelled: cancel }).eq("id", eventId).eq("team_id", teamId);
    if (error) throw new Error(getUserFacingSupabaseError(error, "Der Terminstatus konnte nicht geändert werden."));
    redirect(`/teams/${teamId}/events/${eventId}?toast=${cancel ? "event-cancelled" : "event-reactivated"}`);
  });
}

export async function respondToEventAction(teamId: string, eventId: string, status: ResponseStatus, returnPath: string, formData: FormData) {
  const safeReturnPath = returnPath.startsWith("/") && !returnPath.startsWith("//") ? returnPath : `/teams/${teamId}/events/${eventId}`;

  await runAction(safeReturnPath, async () => {
    const { supabase, user } = await requireTeamAccess(teamId, safeReturnPath);

    if (!responseStatuses.includes(status)) throw new Error("Bitte wähle Zusage, Vielleicht oder Absage.");

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, ends_at, is_cancelled")
      .eq("id", eventId)
      .eq("team_id", teamId)
      .maybeSingle();

    if (eventError || !event) throw new Error(getUserFacingSupabaseError(eventError, "Der Termin wurde nicht gefunden."));
    if (event.is_cancelled) throw new Error("Dieser Termin wurde abgesagt.");
    if (new Date(event.ends_at).getTime() < Date.now()) throw new Error("Dieser Termin ist bereits vorbei.");

    const comment = getNullableString(formData, "comment")?.slice(0, 280) ?? null;
    const { error } = await supabase.from("event_responses").upsert({
      event_id: eventId,
      user_id: user.id,
      status,
      comment,
      responded_at: new Date().toISOString()
    }, { onConflict: "event_id,user_id" });

    if (error) throw new Error(getUserFacingSupabaseError(error, "Deine Antwort konnte nicht gespeichert werden."));
    redirect(`${safeReturnPath}${safeReturnPath.includes("?") ? "&" : "?"}toast=response-saved`);
  });
}
