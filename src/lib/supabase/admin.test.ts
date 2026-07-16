import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createAdminFetch } from "./admin";

describe("admin Supabase request authorization", () => {
  it("keeps opaque secret apikey authentication but removes its invalid bearer header", async () => {
    const fetchImplementation = vi.fn(async () => new Response(null, { status: 200 })) as unknown as typeof fetch;
    const adminFetch = createAdminFetch("sb_secret_local", fetchImplementation);

    await adminFetch("http://127.0.0.1:54321/rest/v1/imports", {
      headers: {
        apikey: "sb_secret_local",
        Authorization: "Bearer sb_secret_local",
        "X-Client-Info": "supabase-js-test",
      },
    });

    const init = vi.mocked(fetchImplementation).mock.calls[0][1];
    const headers = new Headers(init?.headers);
    expect(headers.get("apikey")).toBe("sb_secret_local");
    expect(headers.has("Authorization")).toBe(false);
    expect(headers.get("X-Client-Info")).toBe("supabase-js-test");
  });

  it("preserves legacy JWT service-role request behavior unchanged", () => {
    const fetchImplementation = vi.fn(async () => new Response(null, { status: 200 })) as unknown as typeof fetch;
    expect(createAdminFetch("legacy.jwt.service-role", fetchImplementation)).toBe(fetchImplementation);
  });
});
