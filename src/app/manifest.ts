import type { MetadataRoute } from "next";
import { TRACKTV_DESCRIPTION, TRACKTV_NAME } from "@/lib/pwa/metadata";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: TRACKTV_NAME,
    short_name: TRACKTV_NAME,
    description: TRACKTV_DESCRIPTION,
    start_url: "/shows",
    scope: "/",
    display: "standalone",
    background_color: "#f3efe6",
    theme_color: "#0f6a5c",
    icons: [
      { src: "/icons/tracktv-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/tracktv-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/tracktv-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
