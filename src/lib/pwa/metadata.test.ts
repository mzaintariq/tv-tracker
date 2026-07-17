import { describe, expect, it } from "vitest";
import { TRACKTV_METADATA, TRACKTV_VIEWPORT } from "@/lib/pwa/metadata";

describe("TrackTV application metadata", () => {
  it("uses the approved global and Apple branding", () => {
    expect(TRACKTV_METADATA).toMatchObject({
      applicationName: "TrackTV", title: "TrackTV",
      description: "Private TV show and movie tracking for your household.",
      icons: { apple: [{ url: "/icons/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" }] },
      appleWebApp: { capable: true, title: "TrackTV", statusBarStyle: "default" },
    });
  });

  it("provides static light and dark colors while preserving zoom and safe-area defaults", () => {
    expect(TRACKTV_VIEWPORT).toEqual({
      width: "device-width", initialScale: 1, colorScheme: "light dark",
      themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#f3efe6" },
        { media: "(prefers-color-scheme: dark)", color: "#12110f" },
      ],
    });
    expect(TRACKTV_VIEWPORT).not.toHaveProperty("maximumScale");
    expect(TRACKTV_VIEWPORT).not.toHaveProperty("userScalable");
    expect(TRACKTV_VIEWPORT).not.toHaveProperty("viewportFit");
  });
});
