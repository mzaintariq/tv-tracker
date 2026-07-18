import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: (props: Record<string, unknown>) => createElement("a", props) }));
import AppError from "@/app/(app)/error";
import MoviesError from "@/app/(app)/movies/error";
import ProfileError from "@/app/(app)/profile/error";
import ProfileSettingsError from "@/app/(app)/profile/settings/error";
import ImportError from "@/app/(app)/profile/import/error";
import ImportDetailError from "@/app/(app)/profile/import/[importId]/error";
import ShowDetailError from "@/app/(app)/shows/[tmdbId]/error";
import MovieDetailError from "@/app/(app)/movies/[tmdbId]/error";
import { RouteErrorState } from "./route-error-state";

const raw = "Supabase PostgreSQL TMDB Error: token at stack trace";
const boundaries = [
  [AppError, "Something went wrong"],
  [MoviesError, "Movies could not be loaded"],
  [ProfileError, "Profile could not be loaded"],
  [ProfileSettingsError, "Settings could not be loaded"],
  [ImportError, "Import data could not be loaded"],
  [ImportDetailError, "Import data could not be loaded"],
  [ShowDetailError, "This show could not be loaded"],
  [MovieDetailError, "This movie could not be loaded"],
] as const;

describe("safe route error states", () => {
  it.each(boundaries)("renders fixed safe copy for %s", (Boundary, title) => {
    const html = renderToStaticMarkup(createElement(Boundary, { error: new Error(raw), reset: () => undefined }));
    expect(html).toContain(title);
    expect(html).toContain("Try again");
    expect(html).not.toContain(raw);
    expect(html).not.toMatch(/Supabase|PostgreSQL|TMDB|stack trace|token/i);
  });

  it("invokes reset and renders the optional back link", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const reset = vi.fn();
    let renderer: ReturnType<typeof create> | undefined;
    await act(() => { renderer = create(createElement(RouteErrorState, { title: "Safe title", description: "Safe description", reset, backHref: "/shows", backLabel: "Back" })); });
    if (!renderer) throw new Error("Error-state renderer was not created.");
    const mounted = renderer;
    await act(() => mounted.root.findByType("button").props.onClick());
    expect(reset).toHaveBeenCalledOnce();
    expect(mounted.root.findByType("a").props.href).toBe("/shows");
    const alert = mounted.root.findByProps({ role: "alert" });
    expect(alert.findAllByType("button")).toHaveLength(0);
    expect(alert.findAllByType("a")).toHaveLength(0);
  });
});
