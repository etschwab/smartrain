import { describe, expect, it } from "vitest";
import {
  addWeeksInAppZone,
  buildJoinPath,
  formatDateTimeLabel,
  formatEventCountdown,
  getDisplayName,
  getEventTypeLabel,
  getInitials,
  getMemberStatusLabel,
  getResponseStatusLabel,
  getRoleLabel,
  getTaskStatusLabel,
  getTeamAccentColor,
  isFutureDate,
  parseDateTimeLocal,
  toDateTimeLocalValue
} from "./utils";

describe("getInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(getInitials("Anna Meier")).toBe("AM");
  });

  it("uppercases lowercase input", () => {
    expect(getInitials("anna meier")).toBe("AM");
  });

  it("only uses one initial for a single-word name", () => {
    expect(getInitials("Anna")).toBe("A");
  });

  it("ignores extra whitespace between words", () => {
    expect(getInitials("Anna   Maria Meier")).toBe("AM");
  });

  it("returns an empty string for an empty name", () => {
    expect(getInitials("")).toBe("");
  });
});

describe("getDisplayName", () => {
  it("prefers the name when present", () => {
    expect(getDisplayName("Anna Meier", "anna@example.com")).toBe("Anna Meier");
  });

  it("falls back to the given fallback when name is empty/whitespace", () => {
    expect(getDisplayName("", "anna@example.com")).toBe("anna@example.com");
    expect(getDisplayName("   ", "anna@example.com")).toBe("anna@example.com");
    expect(getDisplayName(null, "anna@example.com")).toBe("anna@example.com");
  });

  it("falls back to 'Unbekannt' when neither is usable", () => {
    expect(getDisplayName(null, null)).toBe("Unbekannt");
    expect(getDisplayName(undefined, "   ")).toBe("Unbekannt");
  });
});

describe("getTeamAccentColor", () => {
  it("returns a custom color unchanged", () => {
    expect(getTeamAccentColor("#123456")).toBe("#123456");
  });

  it("falls back to the default red for a legacy green team color", () => {
    expect(getTeamAccentColor("#16a34a")).toBe("#dc2626");
    // legacy set is matched case-insensitively
    expect(getTeamAccentColor("#16A34A")).toBe("#dc2626");
  });

  it("falls back to the default red when no color is set", () => {
    expect(getTeamAccentColor(null)).toBe("#dc2626");
    expect(getTeamAccentColor(undefined)).toBe("#dc2626");
  });
});

describe("isFutureDate", () => {
  it("is true for a date in the future", () => {
    expect(isFutureDate(new Date(Date.now() + 60_000))).toBe(true);
  });

  it("is false for a date in the past", () => {
    expect(isFutureDate(new Date(Date.now() - 60_000))).toBe(false);
  });
});

describe("buildJoinPath", () => {
  it("builds the /join/<code> path", () => {
    expect(buildJoinPath("abc123")).toBe("/join/abc123");
  });
});

describe("formatEventCountdown", () => {
  const now = new Date("2026-01-01T12:00:00Z");

  it("shows 'Startet jetzt' once the event has started", () => {
    expect(formatEventCountdown(new Date("2026-01-01T11:59:00Z"), now)).toBe("Startet jetzt");
  });

  it("shows minutes under an hour away", () => {
    expect(formatEventCountdown(new Date("2026-01-01T12:30:00Z"), now)).toBe("In 30 Min.");
  });

  it("shows hours and minutes under a day away", () => {
    expect(formatEventCountdown(new Date("2026-01-01T14:15:00Z"), now)).toBe("In 2 Std. 15 Min.");
  });

  it("omits minutes when the countdown is an exact number of hours", () => {
    expect(formatEventCountdown(new Date("2026-01-01T15:00:00Z"), now)).toBe("In 3 Std.");
  });

  it("shows '1 Tag' (singular) for exactly one day away", () => {
    expect(formatEventCountdown(new Date("2026-01-02T12:00:00Z"), now)).toBe("In 1 Tag");
  });

  it("shows a day count for multiple days away", () => {
    expect(formatEventCountdown(new Date("2026-01-04T12:00:00Z"), now)).toBe("In 3 Tagen");
  });
});

describe("label lookups", () => {
  it("getRoleLabel resolves a known role", () => {
    expect(getRoleLabel("owner")).toBe("Owner");
  });

  it("getEventTypeLabel resolves a known type", () => {
    expect(getEventTypeLabel("training")).toBe("Training");
  });

  it("getResponseStatusLabel resolves a known status", () => {
    expect(getResponseStatusLabel("yes")).toBe("Zugesagt");
  });

  it("getMemberStatusLabel resolves a known status", () => {
    expect(getMemberStatusLabel("active")).toBe("Aktiv");
  });

  it("getTaskStatusLabel resolves a known status", () => {
    expect(getTaskStatusLabel("open")).toBe("Offen");
  });

  it("falls back to the raw value for a key missing from the label map", () => {
    expect(getRoleLabel("guest" as never)).toBe("guest");
  });
});

describe("Swiss time zone handling", () => {
  it("parses datetime-local input as Swiss summer time", () => {
    expect(parseDateTimeLocal("2026-07-14T18:30")?.toISOString()).toBe("2026-07-14T16:30:00.000Z");
  });

  it("parses datetime-local input as Swiss winter time", () => {
    expect(parseDateTimeLocal("2026-11-17T18:30")?.toISOString()).toBe("2026-11-17T17:30:00.000Z");
  });

  it("rejects malformed input", () => {
    expect(parseDateTimeLocal("")).toBeNull();
    expect(parseDateTimeLocal("morgen")).toBeNull();
  });

  it("round-trips through toDateTimeLocalValue", () => {
    expect(toDateTimeLocalValue("2026-07-14T16:30:00.000Z")).toBe("2026-07-14T18:30");
    expect(toDateTimeLocalValue("2026-11-17T17:30:00.000Z")).toBe("2026-11-17T18:30");
  });

  it("keeps the local training time when a weekly series crosses the DST change", () => {
    const beforeChange = parseDateTimeLocal("2026-10-20T18:30")!;
    const afterChange = addWeeksInAppZone(beforeChange, 1);
    expect(afterChange.toISOString()).toBe("2026-10-27T17:30:00.000Z");
    expect(toDateTimeLocalValue(afterChange)).toBe("2026-10-27T18:30");
  });

  it("labels today and tomorrow relative to Swiss time", () => {
    const now = new Date("2026-07-14T21:30:00.000Z"); // 23:30 in Zurich
    expect(formatDateTimeLabel("2026-07-14T20:00:00.000Z", now)).toBe("Heute, 22:00");
    expect(formatDateTimeLabel("2026-07-14T22:30:00.000Z", now)).toBe("Morgen, 00:30");
  });
});
