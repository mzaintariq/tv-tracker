import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ watched: vi.fn(), favourite: vi.fn(), remove: vi.fn(), updateDate: vi.fn(), refresh: vi.fn(), push: vi.fn(), notify: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh, push: mocks.push }) }));
vi.mock("@/app/actions/movies", () => ({
  setMovieWatched: mocks.watched, toggleMovieFavourite: mocks.favourite, removeMovie: mocks.remove, updateMovieWatchedAt: mocks.updateDate, syncMovieMetadata: vi.fn(),
}));
vi.mock("@/components/media/metadata-refresh-control", () => ({ MetadataRefreshControl: (props: object) => createElement("div", { "data-refresh-control": true, ...props }) }));
vi.mock("@/components/ui/notifications", () => ({ useNotifications: () => ({ notify: mocks.notify }) }));
import { MovieControls } from "@/components/movies/movie-controls";
import type { UserMovie } from "@/types/database";

const membership = (watchedAt: string | null, favourite: boolean): UserMovie => ({ id: "membership", user_id: "user", media_item_id: "media", watched_at: watchedAt, is_favourite: favourite, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" });
async function render(watchedAt: string | null, favourite = false): Promise<ReactTestRenderer> { let renderer!: ReactTestRenderer; await act(() => { renderer = create(createElement(MovieControls, { tmdbId: 1, mediaId: "media", title: "Toy Story 5", timeZone: "UTC", membership: membership(watchedAt, favourite) }), { createNodeMock: (element) => element.type === "input" ? { value: "2026-08-04T10:30" } : null }); }); return renderer; }

describe("compact movie tracking actions", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.watched.mockResolvedValue({ success: "saved" }); mocks.favourite.mockResolvedValue({ success: "saved" }); mocks.remove.mockResolvedValue({ success: "removed" }); mocks.updateDate.mockResolvedValue({ success: "updated" }); });
  it("routes compact action feedback to the notification drawer", async () => {
    mocks.watched.mockResolvedValue({ success: "Movie marked watched." });
    const renderer = await render(null);
    await act(async () => renderer.root.findByProps({ "aria-label": "Mark Toy Story 5 watched" }).props.onClick());
    expect(mocks.notify).toHaveBeenCalledWith("Movie marked watched.", "success");
    expect(renderer.root.findAllByProps({ role: "status" })).toHaveLength(0);
  });
  it("renders inactive and active toggles with complete accessible names", async () => {
    const inactive = await render(null);
    expect(inactive.root.findByProps({ "aria-label": "Mark Toy Story 5 watched" }).props["aria-pressed"]).toBe(false);
    expect(inactive.root.findByProps({ "aria-label": "Add Toy Story 5 to favourites" }).props["aria-pressed"]).toBe(false);
    const active = await render("2026-08-05T12:00:00Z", true);
    expect(active.root.findByProps({ "aria-label": "Mark Toy Story 5 unwatched" }).props["aria-pressed"]).toBe(true);
    expect(active.root.findByProps({ "aria-label": "Remove Toy Story 5 from favourites" }).props["aria-pressed"]).toBe(true);
  });
  it("hides the date input until Edit and Cancel closes without saving", async () => {
    const renderer = await render("2026-08-05T12:00:00Z");
    expect(renderer.root.findAllByType("input")).toHaveLength(0);
    await act(() => renderer.root.findByProps({ "aria-controls": "movie-watched-date-editor" }).props.onClick());
    expect(renderer.root.findByType("input").props.defaultValue).toBe("2026-08-05T12:00");
    const cancel = renderer.root.findByProps({ "aria-controls": "movie-watched-date-editor" });
    expect(cancel.children).toContain("Cancel");
    await act(() => cancel.props.onClick());
    expect(renderer.root.findAllByType("input")).toHaveLength(0); expect(mocks.updateDate).not.toHaveBeenCalled();
  });
  it("disables compact actions and prevents duplicate watched submissions while pending", async () => {
    let resolve: ((value: { success: string }) => void) | undefined;
    mocks.watched.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const renderer = await render(null);
    const watch = renderer.root.findByProps({ "aria-label": "Mark Toy Story 5 watched" });
    await act(() => watch.props.onClick());
    expect(watch.props.disabled).toBe(true);
    await act(() => watch.props.onClick());
    expect(mocks.watched).toHaveBeenCalledOnce();
    await act(async () => resolve?.({ success: "saved" }));
  });
  it("saves through the existing action with timezone and safe pending guard", async () => {
    const renderer = await render("2026-08-05T12:00:00Z");
    await act(() => renderer.root.findByProps({ "aria-controls": "movie-watched-date-editor" }).props.onClick());
    const save = renderer.root.findAllByType("button").find((button) => button.children.includes("Save"));
    await act(async () => save?.props.onClick());
    expect(mocks.updateDate).toHaveBeenCalledWith(1, "media", "2026-08-04T10:30", "UTC");
  });
  it("associates an invalid date failure with the revealed input", async () => {
    mocks.updateDate.mockResolvedValue({ error: "Choose a valid historical watched date." });
    const renderer = await render("2026-08-05T12:00:00Z");
    await act(() => renderer.root.findByProps({ "aria-controls": "movie-watched-date-editor" }).props.onClick());
    const save = renderer.root.findAllByType("button").find((button) => button.children.includes("Save"));
    await act(async () => save?.props.onClick());
    expect(renderer.root.findByType("input").props["aria-invalid"]).toBe(true);
    expect(renderer.root.findByProps({ role: "alert" }).children).toContain("Choose a valid historical watched date.");
  });
  it("keeps remove destructive, confirmed, and explains data loss", async () => {
    const confirm = vi.fn().mockReturnValue(true);
    vi.stubGlobal("window", { confirm });
    const renderer = await render(null);
    await act(async () => renderer.root.findByProps({ "aria-label": "Remove Toy Story 5 from library" }).props.onClick());
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("watched date and favourite state")); expect(mocks.remove).toHaveBeenCalled(); expect(mocks.push).toHaveBeenCalledWith("/movies");
    expect(renderer.toJSON()).toBeTruthy();
  });
});
