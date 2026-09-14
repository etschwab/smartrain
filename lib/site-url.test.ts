import { afterEach, describe, expect, it, vi } from "vitest";
import { getSiteUrl } from "./site-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSiteUrl", () => {
  it("normalizes a configured URL without a protocol", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "smartrain.etienneschwab.ch");
    expect(getSiteUrl()).toBe("https://smartrain.etienneschwab.ch");
  });

  it("returns just the origin, dropping any path", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://smartrain.etienneschwab.ch/some/path");
    expect(getSiteUrl()).toBe("https://smartrain.etienneschwab.ch");
  });

  it("falls back to a Vercel deployment URL when no site URL is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "smartrain.vercel.app");
    expect(getSiteUrl()).toBe("https://smartrain.vercel.app");
  });

  it("prefers VERCEL_PROJECT_PRODUCTION_URL over VERCEL_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "prod.vercel.app");
    vi.stubEnv("VERCEL_URL", "preview.vercel.app");
    expect(getSiteUrl()).toBe("https://prod.vercel.app");
  });

  it("defaults to localhost outside production when nothing is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("throws in production when nothing is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getSiteUrl()).toThrow();
  });

  it("throws in production when the configured URL points to localhost", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getSiteUrl()).toThrow();
  });

  it("allows a *.localhost subdomain to throw the same way in production", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://smartrain.localhost:3000");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getSiteUrl()).toThrow();
  });

  it("throws for a configured value that is not a valid URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not a url");
    expect(() => getSiteUrl()).toThrow("NEXT_PUBLIC_SITE_URL ist keine gültige URL.");
  });
});
