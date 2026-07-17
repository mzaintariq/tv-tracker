import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("TrackTV web app manifest", () => {
  it("defines the approved standalone application identity", () => {
    const value = manifest();
    expect(value).toMatchObject({
      id: "/", name: "TrackTV", short_name: "TrackTV",
      description: "Private TV show and movie tracking for your household.",
      start_url: "/shows", scope: "/", display: "standalone",
      background_color: "#f3efe6", theme_color: "#0f6a5c",
    });
    expect(value).not.toHaveProperty("orientation");
  });

  it("contains only the approved standard and maskable icons", () => {
    expect(manifest().icons).toEqual([
      { src: "/icons/tracktv-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/tracktv-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/tracktv-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ]);
  });

  it("does not introduce unrelated install features", () => {
    const value = manifest();
    for (const key of ["screenshots", "shortcuts", "protocol_handlers", "share_target", "related_applications"]) expect(value).not.toHaveProperty(key);
  });
});
