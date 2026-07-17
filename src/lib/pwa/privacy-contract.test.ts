import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Phase 9B privacy and public-route contract", () => {
  const productionFiles = ["src/app/manifest.ts", "src/app/layout.tsx", "src/lib/pwa/metadata.ts", "src/proxy.ts"];
  const implementation = productionFiles.map((path) => readFileSync(path, "utf8")).join("\n").toLowerCase();
  const proxy = readFileSync("src/proxy.ts", "utf8");

  it("adds no service worker, offline cache, or custom installation prompt", () => {
    for (const forbidden of ["serviceworker", "service-worker", "beforeinstallprompt", "caches.open", "workbox", "next-pwa"]) expect(implementation).not.toContain(forbidden);
  });

  it("keeps manifest and image assets public without changing protected routes", () => {
    expect(proxy).toContain("manifest.webmanifest");
    expect(proxy).toContain("svg|png|jpg|jpeg|gif|webp");
    const protectedPaths = readFileSync("src/lib/supabase/proxy.ts", "utf8");
    for (const path of ["/shows", "/movies", "/explore", "/profile"]) expect(protectedPaths).toContain(path);
  });
});
