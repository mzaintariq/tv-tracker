import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("primary media section headings", () => {
  it("does not render the removed contextual headings in pages or loading states", () => {
    const paths = [
      "src/app/(app)/shows/page.tsx",
      "src/app/(app)/shows/loading.tsx",
      "src/app/(app)/shows/upcoming/page.tsx",
      "src/app/(app)/shows/upcoming/loading.tsx",
      "src/app/(app)/movies/page.tsx",
      "src/app/(app)/movies/loading.tsx",
    ];
    const removedCopy = [
      "Your watch list and television progress.",
      "Announced releases from your active tracked shows.",
      "Your movie watch list and watched history.",
    ];
    for (const path of paths) {
      const source = readFileSync(path, "utf8");
      for (const copy of removedCopy) expect(source, path).not.toContain(copy);
    }
  });
});
