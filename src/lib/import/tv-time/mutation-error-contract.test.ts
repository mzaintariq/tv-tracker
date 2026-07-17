import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("touched mutation error contracts", () => {
  const imports = readFileSync("src/app/actions/imports.ts", "utf8");
  const shows = readFileSync("src/app/actions/shows.ts", "utf8");
  const movies = readFileSync("src/app/actions/movies.ts", "utf8");
  const library = readFileSync("src/app/actions/library.ts", "utf8");

  it("does not return raw database messages from touched actions", () => {
    for (const source of [imports, shows, movies, library]) {
      expect(source).not.toMatch(/return\s+\{\s*error:\s*(?:\w+\.)?error\.message/);
      expect(source).not.toMatch(/return\s+\{\s*error:\s*\w+Error\.message/);
    }
  });

  it("uses stable mutation fallbacks while retaining domain validation", () => {
    expect(shows).toContain("The show could not be updated. Please try again.");
    expect(movies).toContain("The movie could not be updated. Please try again.");
    expect(library).toContain("Your library could not be updated. Please try again.");
    expect(imports).toContain("This item is currently being matched. Try again shortly.");
    expect(imports).toContain("An import being applied cannot be deleted.");
  });
});
