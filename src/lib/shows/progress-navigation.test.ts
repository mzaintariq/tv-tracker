import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const card = readFileSync("src/components/explore/media-card.tsx", "utf8");
const action = readFileSync("src/app/actions/library.ts", "utf8");
const page = readFileSync("src/app/(app)/shows/[tmdbId]/page.tsx", "utf8");

describe("show progress navigation contract", () => {
  it("links the poster and title to the detail/setup flow", () => {
    expect(card).toContain('href={`/${item.mediaType === "tv" ? "shows" : "movies"}/${item.tmdbId}`}');
  });

  it("shows write errors, prevents navigation after failure, and blocks duplicate clicks", () => {
    expect(card).toContain("setError(result.error)");
    expect(card).toContain("disabled={isPending}");
    expect(card).toContain('role="alert"');
  });

  it("prepares metadata before overlay navigation to the setup flow", () => {
    expect(card).toContain('from "next/link"');
    expect(card.indexOf("await prepareShowProgress(item.tmdbId)")).toBeGreaterThan(-1);
    expect(card.indexOf("await prepareShowProgress(item.tmdbId)")).toBeLessThan(card.indexOf("router.push(`/shows/${item.tmdbId}`)"));
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
