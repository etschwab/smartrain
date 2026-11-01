import { clsx, type ClassValue } from "clsx";
import { addDays, format } from "date-fns";
import { de } from "date-fns/locale";
import { twMerge } from "tailwind-merge";
import {
  eventTypeLabels,
  memberStatusLabels,
  responseStatusLabels,
  taskStatusLabels,
  teamRoleLabels
} from "./constants";
import type { EventType, MemberStatus, ResponseStatus, TaskStatus, TeamRole } from "./types";

const legacyGreenTeamColors = new Set(["#115e59", "#0f766e", "#047857", "#16a34a", "#22c55e", "#65a30d"]);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Teams plan in Swiss local time, while the server (Vercel) runs in UTC.
// All parsing and formatting of wall-clock times goes through this zone.
export const APP_TIME_ZONE = "Europe/Zurich";

const zonedPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit"
});

function getZonedParts(value: string | Date) {
  const parts = Object.fromEntries(
    zonedPartsFormatter.formatToParts(new Date(value)).map((part) => [part.type, part.value])
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
}

function getTimeZoneOffset(timestamp: number) {
  const parts = getZonedParts(new Date(timestamp));
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - Math.floor(timestamp / 1000) * 1000;
}

function zonedWallClockToDate(year: number, month: number, day: number, hour: number, minute: number) {
  const wallClock = Date.UTC(year, month - 1, day, hour, minute);
  const firstGuess = wallClock - getTimeZoneOffset(wallClock);
  return new Date(wallClock - getTimeZoneOffset(firstGuess));
}

/** Returns a Date whose local fields equal the wall-clock time in APP_TIME_ZONE (for date-fns formatting only). */
function toZonedDisplayDate(value: string | Date) {
  const parts = getZonedParts(value);
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

/** Parses the value of an `<input type="datetime-local">` as Swiss local time. */
export function parseDateTimeLocal(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value.trim());

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match.map(Number);
  return zonedWallClockToDate(year, month, day, hour, minute);
}

/** Adds whole weeks while keeping the local wall-clock time stable across daylight-saving changes. */
export function addWeeksInAppZone(value: string | Date, weeks: number) {
  const parts = getZonedParts(value);
  return zonedWallClockToDate(parts.year, parts.month, parts.day + weeks * 7, parts.hour, parts.minute);
}

export function formatDateLabel(value: string | Date, pattern = "dd. MMM yyyy") {
  return format(toZonedDisplayDate(value), pattern, { locale: de });
}

export function formatTimeLabel(value: string | Date) {
  return format(toZonedDisplayDate(value), "HH:mm", { locale: de });
}

export function formatDateTimeLabel(value: string | Date, now = new Date()) {
  const date = toZonedDisplayDate(value);
  const today = toZonedDisplayDate(now);
  const dayKey = format(date, "yyyy-MM-dd");

  if (dayKey === format(today, "yyyy-MM-dd")) {
    return `Heute, ${format(date, "HH:mm", { locale: de })}`;
  }

  if (dayKey === format(addDays(today, 1), "yyyy-MM-dd")) {
    return `Morgen, ${format(date, "HH:mm", { locale: de })}`;
  }

  return format(date, "EEE, dd. MMM yyyy, HH:mm", { locale: de });
}

export function formatEventCountdown(value: string | Date, now = new Date()) {
  const minutes = Math.ceil((new Date(value).getTime() - now.getTime()) / 60_000);

  if (minutes <= 0) {
    return "Startet jetzt";
  }

  if (minutes < 60) {
    return `In ${minutes} Min.`;
  }

  if (minutes < 24 * 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `In ${hours} Std. ${remainingMinutes} Min.` : `In ${hours} Std.`;
  }

  const days = Math.ceil(minutes / (24 * 60));
  return days === 1 ? "In 1 Tag" : `In ${days} Tagen`;
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function buildJoinPath(inviteCode: string) {
  return `/join/${inviteCode}`;
}

export function getDisplayName(name?: string | null, fallback?: string | null) {
  if (name && name.trim().length > 0) {
    return name;
  }

  if (fallback && fallback.trim().length > 0) {
    return fallback;
  }

  return "Unbekannt";
}

export function getTeamAccentColor(color?: string | null) {
  const normalizedColor = color?.trim().toLowerCase();

  if (!normalizedColor || legacyGreenTeamColors.has(normalizedColor)) {
    return "#dc2626";
  }

  return color ?? "#dc2626";
}

export function isFutureDate(value: string | Date) {
  return new Date(value).getTime() > Date.now();
}

export function getRoleLabel(role: TeamRole) {
  return teamRoleLabels[role] ?? role;
}

export function getMemberStatusLabel(status: MemberStatus) {
  return memberStatusLabels[status] ?? status;
}

export function getEventTypeLabel(type: EventType) {
  return eventTypeLabels[type] ?? type;
}

export function getResponseStatusLabel(status: ResponseStatus) {
  return responseStatusLabels[status] ?? status;
}

export function getTaskStatusLabel(status: TaskStatus) {
  return taskStatusLabels[status] ?? status;
}

export function toDateTimeLocalValue(value?: string | Date | null) {
  if (!value) {
    return "";
  }

  return format(toZonedDisplayDate(value), "yyyy-MM-dd'T'HH:mm");
}
