import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Explore card navigation", () => {
  const source = readFileSync("src/components/explore/media-card.tsx", "utf8");

  it("links library items and presents unadded posters and titles without false navigation", () => {
    expect(source).toContain("inLibrary ? (");
    expect(source).toContain("<Link href={detailHref}");
    expect(source).toContain('<div className="block h-full');
    expect(source).toContain(": <PosterCardTitle title={item.title} />");
  });

  it("keeps Add and Remove as separate accessible controls", () => {
    expect(source).toContain("<button type=\"button\" onClick={handleToggle}");
    expect(source).toContain("aria-label={`${actionLabel}: ${item.title}`}");
    expect(source).toMatch(/<\/Link>\s*\) : \(\s*<div[\s\S]*?<\/div>\s*\)}\s*<button/);
  });
});
