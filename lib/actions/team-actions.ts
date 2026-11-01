"use server";

import { redirect } from "next/navigation";
import { runAction } from "@/lib/action-errors";
import { createAdminClient } from "@/lib/supabase-admin";
import { requireProfile, requireTeamManager, requireTeamOwner } from "@/lib/supabase-server";
import { managerRoles, MAX_OWNED_TEAMS } from "@/lib/constants";
import { getPublicInvite } from "@/lib/data";
import { getUserFacingSupabaseError, isRecoverableSetupError } from "@/lib/supabase-errors";
import type { TeamInvite, TeamRole } from "@/lib/types";

function getString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function getNullableString(formData: FormData, name: string) {
  const value = getString(formData, name);
  return value.length > 0 ? value : null;
}

function createInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

async function createTeamInviteInternal(
  supabase: Awaited<ReturnType<typeof requireProfile>>["supabase"],
  teamId: string,
  createdBy: string,
  role: string,
  expiresAt: string | null
) {
  const code = createInviteCode();
  const adminSupabase = createAdminClient();
  const writeClient = adminSupabase ?? supabase;

  if (!adminSupabase) {
    const rpcInvite = await supabase.rpc("create_team_invite", {
      target_team_id: teamId,
      invite_code: code,
      invite_role: role,
      invite_expires_at: expiresAt
    });

    if (!rpcInvite.error) {
      return rpcInvite.data;
    }

    if (!isRecoverableSetupError(rpcInvite.error)) {
      throw new Error(getUserFacingSupabaseError(rpcInvite.error, "Der Einladungslink konnte nicht erstellt werden."));
    }
  }

  const { data: team, error: teamError } = await writeClient
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  if (teamError) {
    throw new Error(getUserFacingSupabaseError(teamError, "Das Team konnte nicht geladen werden."));
  }

  const teamName = typeof team.name === "string" && team.name ? team.name : "Team";
  const teamSport =
    typeof team.sport === "string" && team.sport
      ? team.sport
      : typeof team.age_group === "string" && team.age_group
        ? team.age_group
        : "Team";

  const { data: invite, error } = await writeClient
    .from("team_invites")
    .insert({
      team_id: teamId,
      code,
      token: code,
      team_name: teamName,
      team_sport: teamSport,
      role,
      created_by: createdBy,
      expires_at: expiresAt
    })
    .select("*")
    .single();

  if (error) {
    if (!isRecoverableSetupError(error)) {
      throw new Error(getUserFacingSupabaseError(error, "Der Einladungslink konnte nicht erstellt werden."));
    }

    const fallback = await writeClient
      .from("invites")
      .insert({
        team_id: teamId,
        token: code,
        created_by: createdBy,
        expires_at: expiresAt
      })
      .select("*")
      .single();

    if (fallback.error) {
      throw new Error(getUserFacingSupabaseError(fallback.error, "Der Einladungslink konnte nicht erstellt werden."));
    }

    return fallback.data;
  }

  return invite;
}

function inviteIsExpired(invite: TeamInvite) {
  return Boolean(invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now());
}

async function joinTeamWithInviteFallback(
  supabase: Awaited<ReturnType<typeof requireProfile>>["supabase"],
  userId: string,
  invite: TeamInvite
) {
  if (!invite.is_active || inviteIsExpired(invite)) {
    throw new Error("Dieser Einladungslink ist nicht mehr aktiv.");
  }

  const role = invite.role satisfies TeamRole;
  const existingMembership = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", invite.team_id)
    .eq("user_id", userId)
    .maybeSingle();

  const membership = existingMembership.data
    ? await supabase
        .from("team_members")
        .update({
          status: "active",
          invited_by: invite.created_by
        })
        .eq("id", existingMembership.data.id)
        .select("team_id")
        .single()
    : await supabase
        .from("team_members")
        .insert({
          team_id: invite.team_id,
          user_id: userId,
          role,
          status: "active",
          invited_by: invite.created_by
        })
        .select("team_id")
        .single();

  if (membership.error) {
    throw new Error(getUserFacingSupabaseError(membership.error, "Der Teambeitritt konnte nicht abgeschlossen werden."));
  }

  await supabase
    .from("team_invites")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", invite.id);

  return invite.team_id;
}

async function countActiveOwners(
  supabase: Awaited<ReturnType<typeof requireProfile>>["supabase"],
  teamId: string
) {
  let ownersResult = await supabase
    .from("team_members")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("role", "owner")
    .eq("status", "active");

  if (isRecoverableSetupError(ownersResult.error)) {
    ownersResult = await supabase
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("team_id", teamId)
      .eq("role", "owner");
  }

  if (ownersResult.error) {
    throw new Error(getUserFacingSupabaseError(ownersResult.error, "Die Rollen im Team konnten nicht geprüft werden."));
  }

  return ownersResult.count ?? 0;
}

async function assertNotLastOwner(
  supabase: Awaited<ReturnType<typeof requireProfile>>["supabase"],
  teamId: string,
  memberId: string
) {
  const { data: member, error: memberError } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", memberId)
    .eq("team_id", teamId)
    .single();

  if (memberError) {
    throw new Error(getUserFacingSupabaseError(memberError, "Das Teammitglied konnte nicht geladen werden."));
  }

  if (member.role !== "owner") {
    return member;
  }

  if ((await countActiveOwners(supabase, teamId)) <= 1) {
    throw new Error("Mindestens ein Owner muss im Team verbleiben.");
  }

  return member;
}

export async function createTeamAction(formData: FormData) {
  await runAction("/teams/new", () => createTeam(formData));
}

async function createTeam(formData: FormData) {
  const { supabase, user } = await requireProfile("/teams/new");

  const name = getString(formData, "name");
  const sport = getString(formData, "sport");
  const season = getString(formData, "season");
  const themeColor = getString(formData, "theme_color") || "#dc2626";

  if (!name || !sport || !season) {
    throw new Error("Bitte fülle Name, Sportart und Saison aus.");
  }

  const ownedTeamsResult = await supabase
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("role", "owner")
    .eq("status", "active");

  if (ownedTeamsResult.error) {
    console.warn("Team limit check skipped because Supabase rejected the count query.", ownedTeamsResult.error);
  }

  if (!ownedTeamsResult.error && (ownedTeamsResult.count ?? 0) >= MAX_OWNED_TEAMS) {
    redirect("/teams?toast=team-limit-reached");
  }

  const rpcTeam = await supabase.rpc("create_team_with_owner", {
    team_name: name,
    team_sport: sport,
    team_season: season,
    team_theme_color: themeColor,
    team_logo_url: getNullableString(formData, "logo_url")
  });

  if (!rpcTeam.error) {
    const teamId = String(rpcTeam.data);

    try {
      await createTeamInviteInternal(supabase, teamId, user.id, "player", null);
    } catch (error) {
      console.warn("Initial invite creation skipped. The team was created successfully.", error);
    }

    redirect(`/teams/${teamId}?toast=team-created`);
  }

  if (!isRecoverableSetupError(rpcTeam.error)) {
    throw new Error(getUserFacingSupabaseError(rpcTeam.error, "Das Team konnte nicht erstellt werden."));
  }

  let teamResult = await supabase
    .from("teams")
    .insert({
      name,
      sport,
      season,
      theme_color: themeColor,
      logo_url: getNullableString(formData, "logo_url"),
      created_by: user.id
    })
    .select("*")
    .single();

  if (isRecoverableSetupError(teamResult.error)) {
    teamResult = await supabase
      .from("teams")
      .insert({
        name,
        age_group: season || sport
      })
      .select("*")
      .single();
  }

  if (teamResult.error) {
    throw new Error(getUserFacingSupabaseError(teamResult.error, "Das Team konnte nicht erstellt werden."));
  }

  const team = teamResult.data;

  let membershipResult = await supabase.from("team_members").insert({
    team_id: team.id,
    user_id: user.id,
    role: "owner",
    status: "active"
  });

  if (isRecoverableSetupError(membershipResult.error)) {
    membershipResult = await supabase.from("team_members").insert({
      team_id: team.id,
      user_id: user.id,
      role: "owner"
    });
  }

  if (membershipResult.error) {
    throw new Error(getUserFacingSupabaseError(membershipResult.error, "Die Teamrolle konnte nicht erstellt werden."));
  }

  try {
    await createTeamInviteInternal(supabase, team.id, user.id, "player", null);
  } catch (error) {
    console.warn("Initial invite creation skipped. The team was created successfully.", error);
  }

  redirect(`/teams/${team.id}?toast=team-created`);
}

export async function createInviteAction(teamId: string, formData: FormData) {
  const { supabase, user } = await requireTeamManager(teamId, `/teams/${teamId}/members`);
  try {
    await createTeamInviteInternal(
      supabase,
      teamId,
      user.id,
      getString(formData, "role") || "player",
      getNullableString(formData, "expires_at")
    );
  } catch (error) {
    console.error("Invite creation failed.", error);
    redirect(`/teams/${teamId}/members?toast=invite-create-failed`);
  }

  redirect(`/teams/${teamId}/members?toast=invite-created`);
}

export async function regenerateInviteAction(teamId: string, inviteId: string) {
  await runAction(`/teams/${teamId}/members`, () => regenerateInvite(teamId, inviteId));
}

async function regenerateInvite(teamId: string, inviteId: string) {
  const { supabase, user } = await requireTeamManager(teamId, `/teams/${teamId}/members`);
  const writeClient = createAdminClient() ?? supabase;
  const { data: invite, error } = await writeClient.from("team_invites").select("*").eq("id", inviteId).eq("team_id", teamId).single();

  if (error) {
    throw new Error(getUserFacingSupabaseError(error, "Der Einladungslink konnte nicht geladen werden."));
  }

  const { error: disableError } = await writeClient.from("team_invites").update({ is_active: false }).eq("id", inviteId).eq("team_id", teamId);

  if (disableError) {
    throw new Error(getUserFacingSupabaseError(disableError, "Der Einladungslink konnte nicht aktualisiert werden."));
  }

  await createTeamInviteInternal(supabase, teamId, user.id, invite.role, invite.expires_at);

  redirect(`/teams/${teamId}/members?toast=invite-regenerated`);
}

export async function toggleInviteAction(teamId: string, inviteId: string, nextActive: boolean) {
  await runAction(`/teams/${teamId}/members`, () => toggleInvite(teamId, inviteId, nextActive));
}

async function toggleInvite(teamId: string, inviteId: string, nextActive: boolean) {
  const { supabase } = await requireTeamManager(teamId, `/teams/${teamId}/members`);
  const writeClient = createAdminClient() ?? supabase;
  const { error } = await writeClient.from("team_invites").update({ is_active: nextActive }).eq("id", inviteId).eq("team_id", teamId);

  if (error) {
    throw new Error(getUserFacingSupabaseError(error, "Der Einladungslink konnte nicht geändert werden."));
  }

  redirect(`/teams/${teamId}/members?toast=invite-updated`);
}

export async function joinTeamAction(inviteCode: string) {
  await runAction(`/join/${encodeURIComponent(inviteCode)}`, () => joinTeam(inviteCode));
}

async function joinTeam(inviteCode: string) {
  const { supabase, user } = await requireProfile(`/join/${inviteCode}`);
  const adminSupabase = createAdminClient();
  let teamId: string;

  if (adminSupabase) {
    const invite = await getPublicInvite(adminSupabase, inviteCode);

    if (!invite) {
      throw new Error("Dieser Einladungslink ist ungültig oder abgelaufen.");
    }

    if (!invite.is_active || inviteIsExpired(invite)) {
      throw new Error("Dieser Einladungslink ist nicht mehr aktiv.");
    }

    const existingMembership = await adminSupabase
      .from("team_members")
      .select("id")
      .eq("team_id", invite.team_id)
      .eq("user_id", user.id)
      .maybeSingle();

    const membership = existingMembership.data
      ? await adminSupabase
          .from("team_members")
          .update({
            status: "active",
            invited_by: invite.created_by
          })
          .eq("id", existingMembership.data.id)
          .select("team_id")
          .single()
      : await adminSupabase
          .from("team_members")
          .insert({
            team_id: invite.team_id,
            user_id: user.id,
            role: invite.role,
            status: "active",
            invited_by: invite.created_by
          })
          .select("team_id")
          .single();

    if (membership.error) {
      throw new Error(getUserFacingSupabaseError(membership.error, "Der Teambeitritt konnte nicht abgeschlossen werden."));
    }

    await adminSupabase
      .from("team_invites")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", invite.id);

    teamId = invite.team_id;
  } else {
    const { data, error } = await supabase.rpc("join_team_with_invite", {
      invite_code: inviteCode
    });

    if (error) {
      if (!isRecoverableSetupError(error)) {
        throw new Error(getUserFacingSupabaseError(error, "Der Teambeitritt konnte nicht abgeschlossen werden."));
      }

      const invite = await getPublicInvite(supabase, inviteCode);

      if (!invite) {
        throw new Error("Dieser Einladungslink ist ungültig oder abgelaufen.");
      }

      teamId = await joinTeamWithInviteFallback(supabase, user.id, invite);
    } else {
      teamId = String(data);
    }
  }

  redirect(`/teams/${teamId}?toast=joined-team`);
}

export async function updateMemberRoleAction(teamId: string, memberId: string, formData: FormData) {
  await runAction(`/teams/${teamId}/members`, () => updateMemberRole(teamId, memberId, formData));
}

async function updateMemberRole(teamId: string, memberId: string, formData: FormData) {
  const { supabase } = await requireTeamOwner(teamId, `/teams/${teamId}/members`);
  const role = getString(formData, "role");

  if (!role) {
    throw new Error("Bitte wähle eine Rolle.");
  }

  const member = await assertNotLastOwner(supabase, teamId, memberId);

  if (!managerRoles.includes(member.role) && role === "owner") {
    if ((await countActiveOwners(supabase, teamId)) >= 3) {
      throw new Error("Bitte halte den Owner-Kreis klein und vergebe stattdessen Coach.");
    }
  }

  const { error } = await supabase.from("team_members").update({ role }).eq("id", memberId).eq("team_id", teamId);

  if (error) {
    throw new Error(getUserFacingSupabaseError(error, "Die Rolle konnte nicht gespeichert werden."));
  }

  redirect(`/teams/${teamId}/members?toast=member-updated`);
}

export async function removeMemberAction(teamId: string, memberId: string) {
  await runAction(`/teams/${teamId}/members`, () => removeMember(teamId, memberId));
}

async function removeMember(teamId: string, memberId: string) {
  const { supabase } = await requireTeamOwner(teamId, `/teams/${teamId}/members`);
  await assertNotLastOwner(supabase, teamId, memberId);

  const { error } = await supabase.from("team_members").delete().eq("id", memberId).eq("team_id", teamId);

  if (error) {
    throw new Error(getUserFacingSupabaseError(error, "Das Mitglied konnte nicht entfernt werden."));
  }

  redirect(`/teams/${teamId}/members?toast=member-removed`);
}
