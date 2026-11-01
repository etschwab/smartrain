import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { getUserFacingSupabaseError, isRecoverableSetupError } from "./supabase-errors";
import type {
  EventRecord,
  EventResponseCounts,
  EventResponseRecord,
  EventTemplate,
  EventWithTeam,
  MemberWithProfile,
  NotificationRecord,
  Profile,
  TaskRecord,
  TaskWithRelations,
  Team,
  TeamInvite,
  TeamMember,
  TeamWithMembership
} from "./types";

type AppSupabaseClient = SupabaseClient<any, "public", any>;
type RawInvite = Partial<TeamInvite> & {
  id: string;
  team_id: string;
  token?: string | null;
  code?: string | null;
};

function assertNoError(error: { message: string } | null, fallback: string) {
  if (error) {
    throw new Error(getUserFacingSupabaseError(error, fallback));
  }
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function normalizeTeam(team: Partial<Team> & { id: string; name: string }): Team {
  return {
    id: team.id,
    name: team.name,
    sport: team.sport ?? "Sport",
    season: team.season ?? ("age_group" in team && typeof team.age_group === "string" ? team.age_group : "Aktuelle Saison"),
    logo_url: team.logo_url ?? null,
    theme_color: team.theme_color ?? "#dc2626",
    created_by: team.created_by ?? null,
    created_at: team.created_at ?? new Date().toISOString(),
    updated_at: team.updated_at ?? team.created_at ?? new Date().toISOString()
  };
}

function emptyCalendarData(teams: TeamWithMembership[]) {
  return {
    teams,
    events: [] as EventWithTeam[]
  };
}

function normalizeMembership(membership: Partial<TeamMember> & { id: string; team_id: string; user_id: string }): TeamMember {
  return {
    id: membership.id,
    team_id: membership.team_id,
    user_id: membership.user_id,
    role: membership.role ?? "player",
    status: membership.status ?? "active",
    invited_by: membership.invited_by ?? null,
    created_at: membership.created_at ?? new Date().toISOString(),
    updated_at: membership.updated_at ?? membership.created_at ?? new Date().toISOString()
  };
}

function normalizeInvite(invite: RawInvite): TeamInvite {
  const code = invite.code ?? invite.token ?? invite.id;

  return {
    id: invite.id,
    team_id: invite.team_id,
    code,
    token: invite.token ?? code,
    team_name: invite.team_name ?? "Team-Einladung",
    team_sport: invite.team_sport ?? "Team",
    role: invite.role ?? "player",
    is_active: invite.is_active ?? true,
    expires_at: invite.expires_at ?? null,
    last_used_at: invite.last_used_at ?? null,
    created_by: invite.created_by ?? null,
    created_at: invite.created_at ?? new Date().toISOString(),
    updated_at: invite.updated_at ?? invite.created_at ?? new Date().toISOString()
  };
}

async function supportsTable(supabase: AppSupabaseClient, table: string, columns = "id") {
  const { error } = await supabase.from(table).select(columns).limit(1);

  if (isRecoverableSetupError(error)) {
    return false;
  }

  assertNoError(error, `${table} konnte nicht geprüft werden`);
  return true;
}

export async function getTeamFeatureSupport(supabase: AppSupabaseClient) {
  const [invites, events, tasks] = await Promise.all([
    supportsTable(supabase, "team_invites"),
    supportsTable(supabase, "events"),
    supportsTable(supabase, "tasks")
  ]);

  return {
    invites,
    events,
    tasks
  };
}

export async function getProfilesMap(supabase: AppSupabaseClient, userIds: string[]) {
  const ids = unique(userIds.filter(Boolean));

  if (ids.length === 0) {
    return new Map<string, Profile>();
  }

  const { data, error } = await supabase.from("profiles").select("*").in("id", ids);
  if (isRecoverableSetupError(error)) {
    return new Map<string, Profile>();
  }

  assertNoError(error, "Profile konnten nicht geladen werden");

  return new Map((data as Profile[]).map((profile) => [profile.id, profile]));
}

export async function listUserTeams(supabase: AppSupabaseClient, userId: string) {
  let membershipsResult = await supabase
    .from("team_members")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active");

  if (isRecoverableSetupError(membershipsResult.error)) {
    membershipsResult = await supabase.from("team_members").select("*").eq("user_id", userId);
  }

  if (isRecoverableSetupError(membershipsResult.error)) {
    return [] satisfies TeamWithMembership[];
  }

  assertNoError(membershipsResult.error, "Mitgliedschaften konnten nicht geladen werden");

  const teamMemberships = (((membershipsResult.data as Array<Partial<TeamMember> & { id: string; team_id: string; user_id: string }>) ?? []).map(
    normalizeMembership
  )) satisfies TeamMember[];
  const teamIds = teamMemberships.map((membership) => membership.team_id);

  if (teamIds.length === 0) {
    return [] satisfies TeamWithMembership[];
  }

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("*")
    .in("id", teamIds)
    .order("name", { ascending: true });

  if (isRecoverableSetupError(teamsError)) {
    return [] satisfies TeamWithMembership[];
  }

  assertNoError(teamsError, "Teams konnten nicht geladen werden");

  const membershipByTeam = new Map(teamMemberships.map((membership) => [membership.team_id, membership]));

  return (((teams as Array<Partial<Team> & { id: string; name: string }>) ?? []).map(normalizeTeam)).map((team) => ({
    ...team,
    membership: membershipByTeam.get(team.id)!
  }));
}

export async function getTeamById(supabase: AppSupabaseClient, teamId: string) {
  const { data, error } = await supabase.from("teams").select("*").eq("id", teamId).maybeSingle();
  if (isRecoverableSetupError(error)) {
    return null;
  }

  assertNoError(error, "Team konnte nicht geladen werden");
  return data ? normalizeTeam(data as Partial<Team> & { id: string; name: string }) : null;
}

export async function listTeamMembersDetailed(supabase: AppSupabaseClient, teamId: string) {
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });

  if (isRecoverableSetupError(error)) {
    return [] satisfies MemberWithProfile[];
  }

  assertNoError(error, "Mitglieder konnten nicht geladen werden");

  const memberships = (((data as Array<Partial<TeamMember> & { id: string; team_id: string; user_id: string }>) ?? []).map(
    normalizeMembership
  )) satisfies TeamMember[];
  const profilesMap = await getProfilesMap(
    supabase,
    memberships.map((membership) => membership.user_id)
  );

  return memberships.map((membership) => ({
    ...membership,
    profile: profilesMap.get(membership.user_id) ?? null
  })) satisfies MemberWithProfile[];
}

export async function listTeamInvites(supabase: AppSupabaseClient, teamId: string) {
  const primary = await supabase
    .from("team_invites")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (!primary.error) {
    return (((primary.data as RawInvite[]) ?? []).map(normalizeInvite)) satisfies TeamInvite[];
  }

  if (!isRecoverableSetupError(primary.error)) {
    assertNoError(primary.error, "Einladungslinks konnten nicht geladen werden");
  }

  const fallback = await supabase
    .from("invites")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (isRecoverableSetupError(fallback.error)) {
    return [] satisfies TeamInvite[];
  }

  assertNoError(fallback.error, "Einladungslinks konnten nicht geladen werden");
  return (((fallback.data as RawInvite[]) ?? []).map(normalizeInvite)) satisfies TeamInvite[];
}

export async function getPublicInvite(supabase: AppSupabaseClient, inviteCode: string) {
  const normalizedCode = inviteCode.trim();
  const uppercaseCode = normalizedCode.toUpperCase();
  const codes = Array.from(new Set([normalizedCode, uppercaseCode].filter(Boolean)));

  const primary = await supabase
    .from("team_invites")
    .select("*")
    .in("code", codes)
    .maybeSingle();

  if (!primary.error && primary.data) {
    return normalizeInvite(primary.data as RawInvite);
  }

  if (primary.error && !isRecoverableSetupError(primary.error)) {
    assertNoError(primary.error, "Einladung konnte nicht geladen werden");
  }

  const tokenResult = await supabase
    .from("team_invites")
    .select("*")
    .in("token", codes)
    .maybeSingle();

  if (!tokenResult.error && tokenResult.data) {
    return normalizeInvite(tokenResult.data as RawInvite);
  }

  const fallback = await supabase
    .from("invites")
    .select("*")
    .in("token", codes)
    .maybeSingle();

  if (isRecoverableSetupError(fallback.error)) {
    return null;
  }

  assertNoError(fallback.error, "Einladung konnte nicht geladen werden");
  return fallback.data ? normalizeInvite(fallback.data as RawInvite) : null;
}

export async function listTeamEvents(supabase: AppSupabaseClient, teamId: string) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("team_id", teamId)
    .order("starts_at", { ascending: true });

  if (isRecoverableSetupError(error)) {
    return [] satisfies EventRecord[];
  }

  assertNoError(error, "Termine konnten nicht geladen werden");
  return ((data as EventRecord[]) ?? []) as EventRecord[];
}

export async function listEventTemplates(supabase: AppSupabaseClient, teamId: string) {
  const { data, error } = await supabase
    .from("event_templates")
    .select("*")
    .eq("team_id", teamId)
    .order("name", { ascending: true });

  if (isRecoverableSetupError(error)) {
    return [] satisfies EventTemplate[];
  }

  assertNoError(error, "Terminvorlagen konnten nicht geladen werden");
  return ((data as EventTemplate[]) ?? []) as EventTemplate[];
}

export async function getEventById(supabase: AppSupabaseClient, eventId: string) {
  const { data, error } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
  if (isRecoverableSetupError(error)) {
    return null;
  }

  assertNoError(error, "Termin konnte nicht geladen werden");
  return (data as EventRecord | null) ?? null;
}

export async function getCoreDashboardData(supabase: AppSupabaseClient, userId: string) {
  const teams = await listUserTeams(supabase, userId);
  const teamIds = teams.map((team) => team.id);

  if (teamIds.length === 0) {
    return { teams, upcomingEvents: [] as EventWithTeam[] };
  }

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .in("team_id", teamIds)
    .gte("starts_at", new Date().toISOString())
    .lte("starts_at", endOfDay(addDays(new Date(), 30)).toISOString())
    .eq("is_cancelled", false)
    .order("starts_at", { ascending: true })
    .limit(6);

  if (isRecoverableSetupError(error)) {
    return { teams, upcomingEvents: [] as EventWithTeam[] };
  }

  assertNoError(error, "Die nächsten Termine konnten nicht geladen werden");
  const teamMap = new Map(teams.map((team) => [team.id, team]));
  const rawEvents = (data as EventRecord[]) ?? [];
  const responses = await listUserResponses(supabase, userId, rawEvents.map((event) => event.id));
  const events = rawEvents.map((event) => ({
    ...event,
    team: teamMap.get(event.team_id) ?? null,
    response: responses.get(event.id) ?? null
  })) satisfies EventWithTeam[];

  return { teams, upcomingEvents: events };
}

/** The current user's own answers for the given events, keyed by event id. */
export async function listUserResponses(supabase: AppSupabaseClient, userId: string, eventIds: string[]) {
  const ids = unique(eventIds.filter(Boolean));

  if (ids.length === 0) {
    return new Map<string, EventResponseRecord>();
  }

  const { data, error } = await supabase
    .from("event_responses")
    .select("*")
    .eq("user_id", userId)
    .in("event_id", ids);

  if (isRecoverableSetupError(error)) {
    return new Map<string, EventResponseRecord>();
  }

  assertNoError(error, "Deine Antworten konnten nicht geladen werden");
  return new Map(((data as EventResponseRecord[]) ?? []).map((response) => [response.event_id, response]));
}

export async function listEventResponses(supabase: AppSupabaseClient, eventId: string) {
  const { data, error } = await supabase
    .from("event_responses")
    .select("*")
    .eq("event_id", eventId)
    .order("responded_at", { ascending: true });

  if (isRecoverableSetupError(error)) {
    return [] satisfies EventResponseRecord[];
  }

  assertNoError(error, "Antworten konnten nicht geladen werden");
  return ((data as EventResponseRecord[]) ?? []) as EventResponseRecord[];
}

export async function listTeamTasks(supabase: AppSupabaseClient, teamId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (isRecoverableSetupError(error)) {
    return [] satisfies TaskWithRelations[];
  }

  assertNoError(error, "Aufgaben konnten nicht geladen werden");

  const tasks = ((data as TaskRecord[]) ?? []) as TaskRecord[];
  const profilesMap = await getProfilesMap(
    supabase,
    tasks.map((task) => task.assigned_to ?? "").filter(Boolean)
  );
  const eventsMap = new Map(
    (await listTeamEvents(supabase, teamId))
      .filter((event) => tasks.some((task) => task.event_id === event.id))
      .map((event) => [event.id, event])
  );

  return tasks.map((task) => ({
    ...task,
    assignee: task.assigned_to ? profilesMap.get(task.assigned_to) ?? null : null,
    event: task.event_id ? eventsMap.get(task.event_id) ?? null : null
  })) satisfies TaskWithRelations[];
}

export async function listUserNotifications(supabase: AppSupabaseClient, userId: string, limit = 6) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (isRecoverableSetupError(error)) {
    return [] satisfies NotificationRecord[];
  }

  assertNoError(error, "Benachrichtigungen konnten nicht geladen werden");
  return ((data as NotificationRecord[]) ?? []) as NotificationRecord[];
}

export async function getEventResponseCounts(
  supabase: AppSupabaseClient,
  eventId: string,
  teamId: string
) {
  const [responses, members] = await Promise.all([
    listEventResponses(supabase, eventId),
    listTeamMembersDetailed(supabase, teamId)
  ]);

  const counts = responses.reduce<EventResponseCounts>(
    (accumulator, response) => {
      accumulator[response.status] += 1;
      return accumulator;
    },
    {
      yes: 0,
      no: 0,
      maybe: 0,
      pending: 0
    }
  );

  counts.pending = members.filter(
    (member) => member.status === "active" && !responses.some((response) => response.user_id === member.user_id)
  ).length;

  return counts;
}

export async function getDashboardData(supabase: AppSupabaseClient, userId: string) {
  const teams = await listUserTeams(supabase, userId);
  const teamIds = teams.map((team) => team.id);
  const notifications = await listUserNotifications(supabase, userId);

  if (teamIds.length === 0) {
    return {
      teams,
      notifications,
      todayEvents: [] as EventRecord[],
      upcomingEvents: [] as EventWithTeam[],
      nextTrainings: [] as EventRecord[],
      nextGames: [] as EventRecord[],
      pendingResponses: [] as EventWithTeam[],
      assignedTasks: [] as TaskWithRelations[]
    };
  }

  const { data: eventsData, error: eventsError } = await supabase
    .from("events")
    .select("*")
    .in("team_id", teamIds)
    .gte("starts_at", startOfDay(addDays(new Date(), -1)).toISOString())
    .lte("starts_at", endOfDay(addDays(new Date(), 30)).toISOString())
    .order("starts_at", { ascending: true });

  if (isRecoverableSetupError(eventsError)) {
    return {
      teams,
      notifications,
      todayEvents: [] as EventRecord[],
      upcomingEvents: [] as EventWithTeam[],
      nextTrainings: [] as EventRecord[],
      nextGames: [] as EventRecord[],
      pendingResponses: [] as EventWithTeam[],
      assignedTasks: [] as TaskWithRelations[]
    };
  }

  assertNoError(eventsError, "Dashboard-Termine konnten nicht geladen werden");

  const events = ((eventsData as EventRecord[]) ?? []) as EventRecord[];
  const eventIds = events.map((event) => event.id);

  let responses: EventResponseRecord[] = [];
  if (eventIds.length > 0) {
    const { data: responseData, error: responseError } = await supabase
      .from("event_responses")
      .select("*")
      .eq("user_id", userId)
      .in("event_id", eventIds);

    if (isRecoverableSetupError(responseError)) {
      responses = [];
    } else {
      assertNoError(responseError, "Dashboard-Antworten konnten nicht geladen werden");
      responses = ((responseData as EventResponseRecord[]) ?? []) as EventResponseRecord[];
    }
  }

  const responseMap = new Map(responses.map((response) => [response.event_id, response]));
  const teamMap = new Map(teams.map((team) => [team.id, team]));
  const upcomingEvents = events
    .filter((event) => new Date(event.starts_at).getTime() >= Date.now())
    .filter((event) => !event.is_cancelled)
    .slice(0, 5)
    .map((event) => ({
      ...event,
      team: teamMap.get(event.team_id) ?? null,
      response: responseMap.get(event.id) ?? null
    })) satisfies EventWithTeam[];

  const { data: taskData, error: taskError } = await supabase
    .from("tasks")
    .select("*")
    .in("team_id", teamIds)
    .eq("status", "open")
    .eq("assigned_to", userId)
    .order("due_at", { ascending: true });

  if (isRecoverableSetupError(taskError)) {
    return {
      teams,
      notifications,
      todayEvents: events.filter((event) => {
        const eventDate = new Date(event.starts_at);
        const now = new Date();
        return eventDate.toDateString() === now.toDateString();
      }),
      upcomingEvents,
      nextTrainings: events.filter((event) => event.type === "training").slice(0, 3),
      nextGames: events.filter((event) => event.type === "game").slice(0, 3),
      pendingResponses: [] as EventWithTeam[],
      assignedTasks: [] as TaskWithRelations[]
    };
  }

  assertNoError(taskError, "Dashboard-Aufgaben konnten nicht geladen werden");

  const assignedTasksRaw = ((taskData as TaskRecord[]) ?? []) as TaskRecord[];
  const eventMap = new Map(events.map((event) => [event.id, event]));

  const assignedTasks = assignedTasksRaw.map((task) => ({
    ...task,
    assignee: null,
    event: task.event_id ? eventMap.get(task.event_id) ?? null : null
  })) satisfies TaskWithRelations[];

  const todayEvents = events.filter((event) => {
    const eventDate = new Date(event.starts_at);
    const now = new Date();
    return eventDate.toDateString() === now.toDateString();
  });

  return {
    teams,
    notifications,
    todayEvents,
    upcomingEvents,
    nextTrainings: events.filter((event) => event.type === "training").slice(0, 3),
    nextGames: events.filter((event) => event.type === "game").slice(0, 3),
    pendingResponses: events
      .filter((event) => new Date(event.starts_at).getTime() >= Date.now())
      .filter((event) => !event.is_cancelled)
      .filter((event) => !event.response_deadline || new Date(event.response_deadline).getTime() >= Date.now())
      .filter((event) => !responseMap.has(event.id))
      .slice(0, 5)
      .map((event) => ({
        ...event,
        team: teamMap.get(event.team_id) ?? null,
        response: null
      })) satisfies EventWithTeam[],
    assignedTasks
  };
}

export async function getUserCalendarData(supabase: AppSupabaseClient, userId: string) {
  const teams = await listUserTeams(supabase, userId);
  const teamIds = teams.map((team) => team.id);

  if (teamIds.length === 0) {
    return emptyCalendarData(teams);
  }

  const { data: eventsData, error: eventsError } = await supabase
    .from("events")
    .select("*")
    .in("team_id", teamIds)
    .gte("starts_at", startOfDay(addDays(new Date(), -7)).toISOString())
    .lte("starts_at", endOfDay(addDays(new Date(), 90)).toISOString())
    .order("starts_at", { ascending: true });

  if (isRecoverableSetupError(eventsError)) {
    return emptyCalendarData(teams);
  }

  assertNoError(eventsError, "Kalender konnte nicht geladen werden");

  const events = ((eventsData as EventRecord[]) ?? []) as EventRecord[];
  const eventIds = events.map((event) => event.id);
  let responses: EventResponseRecord[] = [];

  if (eventIds.length > 0) {
    const { data: responseData, error: responseError } = await supabase
      .from("event_responses")
      .select("*")
      .eq("user_id", userId)
      .in("event_id", eventIds);

    if (!isRecoverableSetupError(responseError)) {
      assertNoError(responseError, "Kalender-Antworten konnten nicht geladen werden");
      responses = ((responseData as EventResponseRecord[]) ?? []) as EventResponseRecord[];
    }
  }

  const teamMap = new Map(teams.map((team) => [team.id, team]));
  const responseMap = new Map(responses.map((response) => [response.event_id, response]));

  return {
    teams,
    events: events.map((event) => ({
      ...event,
      team: teamMap.get(event.team_id) ?? null,
      response: responseMap.get(event.id) ?? null
    })) satisfies EventWithTeam[]
  };
}
