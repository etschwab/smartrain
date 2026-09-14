import { describe, expect, it } from "vitest";
import { safeLocalPath } from "./safe-redirect";

describe("safeLocalPath", () => {
  it("keeps a plain in-app path", () => {
    expect(safeLocalPath("/dashboard")).toBe("/dashboard");
  });

  it("keeps query string and hash", () => {
    expect(safeLocalPath("/teams?tab=open#top")).toBe("/teams?tab=open#top");
  });

  it("falls back for null/undefined/empty values", () => {
    expect(safeLocalPath(null)).toBe("/");
    expect(safeLocalPath(undefined)).toBe("/");
    expect(safeLocalPath("")).toBe("/");
  });

  it("uses the given fallback instead of the default", () => {
    expect(safeLocalPath(null, "/dashboard")).toBe("/dashboard");
    expect(safeLocalPath("", "/dashboard")).toBe("/dashboard");
  });

  it("rejects an absolute external URL", () => {
    expect(safeLocalPath("https://evil.example/phish")).toBe("/");
  });

  it("rejects a protocol-relative URL (open redirect attempt)", () => {
    expect(safeLocalPath("//evil.example/phish")).toBe("/");
  });

  it("rejects a path containing a backslash", () => {
    expect(safeLocalPath("/\\evil.example")).toBe("/");
  });

  it("rejects a value that does not start with a slash", () => {
    expect(safeLocalPath("dashboard")).toBe("/");
    expect(safeLocalPath("javascript:alert(1)")).toBe("/");
  });
});
