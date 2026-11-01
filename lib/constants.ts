import type { EventType, MemberStatus, ResponseStatus, TaskStatus, TeamRole } from "./types";

export const managerRoles: TeamRole[] = ["owner", "coach"];
export const MAX_OWNED_TEAMS = 3;

export const teamRoleOptions: Array<{ value: TeamRole; label: string }> = [
  { value: "owner", label: "Owner" },
  { value: "coach", label: "Coach" },
  { value: "player", label: "Spieler" },
  { value: "parent", label: "Elternteil" }
];

export const teamRoleLabels: Record<TeamRole, string> = {
  owner: "Owner",
  coach: "Coach",
  player: "Spieler",
  parent: "Elternteil"
};

export const eventTypeOptions: Array<{ value: EventType; label: string }> = [
  { value: "training", label: "Training" },
  { value: "game", label: "Spiel" },
  { value: "meeting", label: "Besprechung" },
  { value: "event", label: "Event" }
];

export const eventTypeLabels: Record<EventType, string> = {
  training: "Training",
  game: "Spiel",
  meeting: "Besprechung",
  event: "Event"
};

export const responseStatusOptions: Array<{ value: ResponseStatus; label: string }> = [
  { value: "yes", label: "Zusage" },
  { value: "no", label: "Absage" },
  { value: "maybe", label: "Vielleicht" }
];

export const responseStatusLabels: Record<ResponseStatus, string> = {
  yes: "Zugesagt",
  no: "Abgesagt",
  maybe: "Vielleicht"
};

export const taskStatusOptions: Array<{ value: TaskStatus; label: string }> = [
  { value: "open", label: "Offen" },
  { value: "done", label: "Erledigt" }
];

export const taskStatusLabels: Record<TaskStatus, string> = {
  open: "Offen",
  done: "Erledigt"
};

export const memberStatusLabels: Record<MemberStatus, string> = {
  active: "Aktiv",
  pending: "Ausstehend",
  inactive: "Inaktiv"
};

export const teamColorOptions = [
  "#dc2626",
  "#ea580c",
  "#d97706",
  "#15803d",
  "#0891b2",
  "#2563eb",
  "#4f46e5",
  "#9333ea",
  "#db2777",
  "#52525b"
];

export const toastMessages: Record<string, string> = {
  "signed-out": "Du wurdest auf allen verbundenen Projekten abgemeldet",
  "team-created": "Team erstellt",
  "team-updated": "Team gespeichert",
  "profile-updated": "Profil aktualisiert",
  "invite-created": "Einladungslink erstellt",
  "invite-create-failed": "Einladungslink konnte noch nicht erstellt werden. Bitte Supabase-Migration ausführen.",
  "invite-regenerated": "Einladungslink erneuert",
  "invite-updated": "Einladungslink aktualisiert",
  "joined-team": "Du bist dem Team beigetreten",
  "member-updated": "Mitgliedsrolle aktualisiert",
  "member-removed": "Mitglied entfernt",
  "team-limit-reached": "Du kannst maximal 3 eigene Teams anlegen",
  "event-created": "Termin erstellt",
  "event-created-template-saved": "Termin und Vorlage erstellt",
  "events-created-template-saved": "Terminserie und Vorlage erstellt",
  "event-created-template-unavailable": "Termin erstellt. Die Vorlagenfunktion benötigt noch die Datenbank-Migration.",
  "event-updated": "Termin gespeichert",
  "event-removed": "Termin gelöscht",
  "event-from-template-created": "Termin aus Vorlage erstellt",
  "event-template-deleted": "Vorlage gelöscht",
  "response-saved": "Antwort gespeichert",
  "task-created": "Aufgabe erstellt",
  "task-updated": "Aufgabe aktualisiert",
  "task-removed": "Aufgabe entfernt",
  "notifications-read": "Benachrichtigungen aktualisiert",
  "news-created": "Neuigkeit veröffentlicht",
  "message-sent": "Nachricht gesendet",
  "entry-removed": "Eintrag entfernt",
  "poll-created": "Abstimmung erstellt",
  "vote-saved": "Stimme gespeichert",
  "absence-created": "Abwesenheit eingetragen",
  "absence-removed": "Abwesenheit entfernt",
  "carpool-created": "Fahrgemeinschaft angeboten",
  "carpool-joined": "Mitfahrplatz reserviert",
  "carpool-left": "Mitfahrplatz freigegeben",
  "ledger-created": "Kasseneintrag erstellt",
  "ledger-updated": "Kassenstatus aktualisiert",
  "lineup-saved": "Aufstellung gespeichert",
  "lineup-updated": "Aufstellung aktualisiert",
  "events-created": "Terminserie erstellt",
  "events-imported": "Termine importiert",
  "event-cancelled": "Termin abgesagt",
  "event-reactivated": "Termin reaktiviert",
  "game-report-saved": "Spielbericht gespeichert"
};
