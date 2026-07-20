import { describe, expect, it } from "vitest";
import { TRACKTV_METADATA, TRACKTV_VIEWPORT } from "@/lib/pwa/metadata";

describe("TrackTV application metadata", () => {
  it("uses the approved global and Apple branding", () => {
    expect(TRACKTV_METADATA).toMatchObject({
      applicationName: "TrackTV", title: "TrackTV",
      description: "Private TV show and movie tracking for your household.",
      icons: {
        icon: [
          { url: "/icon.png", sizes: "192x192", type: "image/png" },
          { url: "/icons/tracktv-192.png", sizes: "192x192", type: "image/png" },
          { url: "/icons/tracktv-512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: [{ url: "/icons/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" }],
      },
      appleWebApp: { capable: true, title: "TrackTV", statusBarStyle: "default" },
    });
  });

  it("provides static theme colors and coordinated safe-area support without restricting zoom", () => {
    expect(TRACKTV_VIEWPORT).toEqual({
      width: "device-width", initialScale: 1, viewportFit: "cover", colorScheme: "light dark",
      themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#f3efe6" },
        { media: "(prefers-color-scheme: dark)", color: "#12110f" },
      ],
    });
    expect(TRACKTV_VIEWPORT).not.toHaveProperty("maximumScale");
    expect(TRACKTV_VIEWPORT).not.toHaveProperty("userScalable");
  });
});
