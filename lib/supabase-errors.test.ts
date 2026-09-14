import { describe, expect, it } from "vitest";
import {
  dataServiceUnavailableMessage,
  getSupabaseErrorMessage,
  getUserFacingSupabaseError,
  isRecoverableSetupError,
  isSupabaseConnectionError
} from "./supabase-errors";

describe("getSupabaseErrorMessage", () => {
  it("returns a plain string error as-is", () => {
    expect(getSupabaseErrorMessage("boom")).toBe("boom");
  });

  it("extracts .message from an error-like object", () => {
    expect(getSupabaseErrorMessage({ message: "relation does not exist" })).toBe("relation does not exist");
  });

  it("returns an empty string for null/undefined/non-error values", () => {
    expect(getSupabaseErrorMessage(null)).toBe("");
    expect(getSupabaseErrorMessage(undefined)).toBe("");
    expect(getSupabaseErrorMessage(42)).toBe("");
    expect(getSupabaseErrorMessage({})).toBe("");
  });
});

describe("isRecoverableSetupError", () => {
  it("matches a known Postgres error code", () => {
    expect(isRecoverableSetupError({ code: "42P01" })).toBe(true);
  });

  it("matches a schema-cache message even without a known code", () => {
    expect(isRecoverableSetupError({ message: "schema cache is stale" })).toBe(true);
  });

  it("matches a missing-table/column message", () => {
    expect(isRecoverableSetupError({ message: 'relation "teams" does not exist' })).toBe(true);
    expect(isRecoverableSetupError({ message: "could not find the 'foo' column" })).toBe(true);
  });

  it("does not flag an unrelated error", () => {
    expect(isRecoverableSetupError({ code: "23505", message: "duplicate key value" })).toBe(false);
  });
});

describe("isSupabaseConnectionError", () => {
  it("matches known network error codes case-insensitively", () => {
    expect(isSupabaseConnectionError({ code: "ECONNREFUSED" })).toBe(true);
    expect(isSupabaseConnectionError({ code: "econnrefused" })).toBe(true);
  });

  it("matches a fetch-failure message", () => {
    expect(isSupabaseConnectionError({ message: "fetch failed" })).toBe(true);
    expect(isSupabaseConnectionError(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("does not flag an unrelated error", () => {
    expect(isSupabaseConnectionError({ code: "23505", message: "duplicate key value" })).toBe(false);
  });
});

describe("getUserFacingSupabaseError", () => {
  it("returns the generic connection message for a network error", () => {
    expect(getUserFacingSupabaseError({ message: "fetch failed" }, "fallback")).toBe(dataServiceUnavailableMessage);
  });

  it("returns the provided fallback for a recoverable setup error", () => {
    expect(getUserFacingSupabaseError({ code: "42P01" }, "Bitte Migration ausführen.")).toBe(
      "Bitte Migration ausführen."
    );
  });

  it("returns the raw Supabase message for an ordinary error", () => {
    expect(getUserFacingSupabaseError({ message: "E-Mail bereits vergeben" }, "fallback")).toBe(
      "E-Mail bereits vergeben"
    );
  });

  it("returns the fallback when there is no usable error message", () => {
    expect(getUserFacingSupabaseError(null, "fallback")).toBe("fallback");
  });
});
