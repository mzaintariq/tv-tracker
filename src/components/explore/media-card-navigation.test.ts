import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Explore card navigation", () => {
  const source = readFileSync("src/components/explore/media-card.tsx", "utf8");
  const gridSource = readFileSync(
    "src/components/explore/media-grid.tsx",
    "utf8",
  );
  const movieSectionsSource = readFileSync(
    "src/components/movies/movie-sections.tsx",
    "utf8",
  );
  const normalizedSource = source.replace(/\s+/g, " ");

  it("links library items and presents unadded posters and titles without false navigation", () => {
    expect(source).toContain("inLibrary ? (");
    expect(source).toContain("href={detailHref}");
    expect(source).toContain('<div className="block min-w-0');
    expect(source).toContain("<CardContent item={item}");
    expect(source).toContain("bg-[var(--surface)]");
  });

  it("keeps Add and Remove as separate accessible controls", () => {
    expect(normalizedSource).toContain(
      '<button type="button" onClick={handleToggle}',
    );
    expect(source).toContain("aria-label={`${actionLabel}: ${item.title}`}");
    expect(source).toMatch(
      /<\/Link>\s*\) : \(\s*<div[\s\S]*?<\/div>\s*\)}\s*<button/,
    );
  });

  it("routes library action feedback through global notifications", () => {
    expect(source).toContain("useNotifications");
    expect(source).toContain("const { notify } = useNotifications()");
    expect(source).toContain("result.error ?? result.success");
    expect(source).not.toContain("setError");
  });

  it("matches the Movies card padding and grid spacing", () => {
    expect(source).toContain(
      'className="min-w-0 space-y-0 p-3 sm:space-y-1 sm:p-4"',
    );
    const gridClasses =
      "grid grid-cols-1 gap-2 sm:gap-4 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
    expect(gridSource).toContain(gridClasses);
    expect(movieSectionsSource).toContain(gridClasses);
  });
});
