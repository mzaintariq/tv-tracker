import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("Next.js image configuration", () => {
  it("keeps the approved optimization and TMDB source policy", () => {
    expect(nextConfig.images).toMatchObject({
      minimumCacheTTL: 2678400,
      formats: ["image/webp"],
      qualities: [75],
      remotePatterns: [
        {
          protocol: "https",
          hostname: "image.tmdb.org",
          pathname: "/t/p/**",
        },
      ],
    });
  });
});
