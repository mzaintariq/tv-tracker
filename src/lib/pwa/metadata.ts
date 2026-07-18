import type { Metadata, Viewport } from "next";

export const TRACKTV_NAME = "TrackTV";
export const TRACKTV_DESCRIPTION = "Private TV show and movie tracking for your household.";

export const TRACKTV_METADATA: Metadata = {
  applicationName: TRACKTV_NAME,
  title: TRACKTV_NAME,
  description: TRACKTV_DESCRIPTION,
  icons: {
    icon: [
      { url: "/icons/tracktv-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/tracktv-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: TRACKTV_NAME, statusBarStyle: "default" },
};

export const TRACKTV_VIEWPORT: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#12110f" },
  ],
};
