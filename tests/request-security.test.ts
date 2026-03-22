import { describe, expect, test } from "bun:test";

import { assertSameOrigin, assertTrustedMutationRequest } from "@/lib/security/request";
import { checkRateLimit } from "@/lib/security/rate-limit";

describe("request security", () => {
  test("accepts same-origin mutation requests with JSON bodies", () => {
    const request = new Request("http://localhost:3000/api/plans", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
        "content-length": "2",
        "sec-fetch-site": "same-origin",
      },
      body: "{}",
    });

    expect(() => assertTrustedMutationRequest(request)).not.toThrow();
  });

  test("accepts same-origin referers when origin is missing", () => {
    const request = new Request("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: {
        referer: "http://localhost:3000/planner",
        "sec-fetch-site": "same-origin",
      },
    });

    expect(() => assertSameOrigin(request)).not.toThrow();
  });

  test("accepts localhost aliases during local development", () => {
    const request = new Request("http://127.0.0.1:3000/api/auth/logout", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "sec-fetch-site": "same-site",
      },
    });

    expect(() => assertSameOrigin(request)).not.toThrow();
  });

  test("rejects cross-site mutation requests", () => {
    const request = new Request("http://localhost:3000/api/plans", {
      method: "POST",
      headers: {
        origin: "https://evil.example.com",
        "content-type": "application/json",
        "content-length": "2",
        "sec-fetch-site": "cross-site",
      },
      body: "{}",
    });

    expect(() => assertTrustedMutationRequest(request)).toThrow("Cross-site request rejected.");
  });

  test("rejects non-json mutation bodies", () => {
    const request = new Request("http://localhost:3000/api/plans", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "text/plain",
        "content-length": "4",
        "sec-fetch-site": "same-origin",
      },
      body: "test",
    });

    expect(() => assertTrustedMutationRequest(request)).toThrow("Unsupported content type.");
  });
});

describe("rate limiting", () => {
  test("blocks requests after the configured threshold", () => {
    const first = checkRateLimit("127.0.0.1", {
      key: "test-rate-limit",
      max: 2,
      windowMs: 60_000,
    });
    const second = checkRateLimit("127.0.0.1", {
      key: "test-rate-limit",
      max: 2,
      windowMs: 60_000,
    });
    const third = checkRateLimit("127.0.0.1", {
      key: "test-rate-limit",
      max: 2,
      windowMs: 60_000,
    });

    expect(first.ok).toBeTrue();
    expect(second.ok).toBeTrue();
    expect(third.ok).toBeFalse();
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });
});
