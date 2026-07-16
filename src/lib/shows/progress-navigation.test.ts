import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const card = readFileSync("src/components/explore/media-card.tsx", "utf8");
const action = readFileSync("src/app/actions/library.ts", "utf8");
const page = readFileSync("src/app/(app)/shows/[tmdbId]/page.tsx", "utf8");

describe("show progress navigation contract", () => {
  it("awaits metadata preparation before navigating", () => {
    expect(card.indexOf("await prepareShowProgress(item.tmdbId)")).toBeGreaterThan(-1);
    expect(card.indexOf("await prepareShowProgress(item.tmdbId)")).toBeLessThan(card.indexOf("router.push(`/shows/${item.tmdbId}`)"));
  });

  it("shows write errors, prevents navigation after failure, and blocks duplicate clicks", () => {
    expect(card).toContain("setError(result.error)");
    expect(card).toContain("disabled={isPending}");
    expect(card).toContain('role="alert"');
  });

  it("does not prefetch a mutation-dependent show route", () => {
    expect(card).not.toContain('from "next/link"');
    expect(card).not.toContain("<Link");
  });

  it("revalidates the concrete show route after metadata insertion", () => {
    expect(action).toContain("revalidatePath(`/shows/${tmdbId}`)");
  });

  it("keeps direct navigation and invalid ID handling server-side", () => {
    expect(page).toContain("parseTmdbId(raw)");
    expect(page).toContain("loadShowPageData(user.id, tmdbId)");
    expect(page).toContain("if (tmdbId === null) notFound()");
  });
});
