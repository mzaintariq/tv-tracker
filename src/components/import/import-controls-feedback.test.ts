import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolve: vi.fn(), deleteImport: vi.fn(), forget: vi.fn(), pause: vi.fn(), confirmCandidate: vi.fn(), skipItem: vi.fn(), skipAll: vi.fn(), push: vi.fn(), refresh: vi.fn(), notify: vi.fn(),
}));
vi.mock("@/app/actions/imports", () => ({ confirmImportCandidate: mocks.confirmCandidate, deleteImportSession: mocks.deleteImport, forgetAllTvTimeImportData: mocks.forget, resolveImportIssue: mocks.resolve, setImportPaused: mocks.pause, skipAllUnresolvedImportItems: mocks.skipAll, skipImportItem: mocks.skipItem }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
vi.mock("./resolution-events", () => ({ notifyResolutionRefresh: mocks.notify }));

import { DeleteImportButton, ForgetTvTimeButton, PauseResumeButton, ResolutionControls, SkipCoordinateButton } from "./import-controls";

function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason?: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
async function mount(component: React.ReactElement): Promise<ReactTestRenderer> { let renderer: ReactTestRenderer | undefined; await act(() => { renderer = create(component); }); if (!renderer) throw new Error("Renderer unavailable."); return renderer; }

beforeEach(() => { vi.clearAllMocks(); globalThis.IS_REACT_ACT_ENVIRONMENT = true; Object.assign(globalThis, { window: { confirm: vi.fn(() => true) } }); });

describe("import mutation feedback", () => {
  it("prevents duplicate coordinate skips and refreshes resolution only after success", async () => {
    const pending = deferred<{ success: string }>(); mocks.resolve.mockReturnValue(pending.promise);
    const renderer = await mount(createElement(SkipCoordinateButton, { importId: "import", issueId: "issue" })); const button = renderer.root.findByType("button");
    await act(() => { button.props.onClick(); button.props.onClick(); });
    expect(mocks.resolve).toHaveBeenCalledOnce(); expect(button.props.disabled).toBe(true);
    await act(() => pending.resolve({ success: "Skipped." }));
    expect(renderer.root.findByType("button").props.disabled).toBe(false); expect(mocks.notify).toHaveBeenCalledOnce(); expect(renderer.root.findByProps({ role: "status" }).children).toContain("Skipped.");
  });

  it("clears coordinate pending state and shows a safe error after rejection", async () => {
    mocks.resolve.mockRejectedValue(new Error("raw stack")); const renderer = await mount(createElement(SkipCoordinateButton, { importId: "import", issueId: "issue" }));
    await act(() => renderer.root.findByType("button").props.onClick());
    expect(renderer.root.findByType("button").props.disabled).toBe(false); expect(renderer.root.findByProps({ role: "alert" }).children.join("")).toContain("could not be completed"); expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("deletes once and navigates only after success", async () => {
    const pending = deferred<{ success: string }>(); mocks.deleteImport.mockReturnValue(pending.promise); const renderer = await mount(createElement(DeleteImportButton, { importId: "import" })); const button = renderer.root.findByType("button");
    await act(() => { button.props.onClick(); button.props.onClick(); }); expect(mocks.deleteImport).toHaveBeenCalledOnce(); expect(mocks.push).not.toHaveBeenCalled();
    await act(() => pending.resolve({ success: "Deleted." })); expect(mocks.push).toHaveBeenCalledWith("/profile/import");
    mocks.push.mockClear(); mocks.deleteImport.mockResolvedValue({ error: "Safe failure." }); await act(() => renderer.root.findByType("button").props.onClick()); expect(mocks.push).not.toHaveBeenCalled(); expect(renderer.root.findByProps({ role: "alert" }).children).toContain("Safe failure.");
  });

  it("pauses or resumes with refresh only after success", async () => {
    mocks.pause.mockResolvedValueOnce({ error: "State changed." }).mockResolvedValueOnce({ success: "Import paused." }); const renderer = await mount(createElement(PauseResumeButton, { importId: "import", paused: false }));
    await act(() => renderer.root.findByType("button").props.onClick()); expect(mocks.refresh).not.toHaveBeenCalled(); expect(renderer.root.findByProps({ role: "alert" }).children).toContain("State changed.");
    await act(() => renderer.root.findByType("button").props.onClick()); expect(mocks.refresh).toHaveBeenCalledOnce(); expect(renderer.root.findByProps({ role: "status" }).children).toContain("Import paused.");
  });

  it("forgets once, keeps failures visible, and refreshes only after success", async () => {
    mocks.forget.mockResolvedValueOnce({ error: "Pause active imports first." }).mockResolvedValueOnce({ success: "Forgotten." }); const renderer = await mount(createElement(ForgetTvTimeButton));
    await act(() => renderer.root.findByType("button").props.onClick()); expect(mocks.refresh).not.toHaveBeenCalled(); expect(renderer.root.findByProps({ role: "alert" }).children).toContain("Pause active imports first.");
    await act(() => renderer.root.findByType("button").props.onClick()); expect(mocks.refresh).toHaveBeenCalledOnce(); expect(renderer.root.findByProps({ role: "status" }).children).toContain("Forgotten.");
  });

  it("guards ResolutionControls and clears pending after rejection", async () => {
    const pending = deferred<{ success: string }>(); mocks.skipItem.mockReturnValue(pending.promise); const renderer = await mount(createElement(ResolutionControls, { importId: "import", itemId: "item", candidates: [] })); const skip = renderer.root.findAllByType("button").find((button) => button.children.includes("Skip this import")); if (!skip) throw new Error("Skip button missing.");
    await act(() => { skip.props.onClick(); skip.props.onClick(); }); expect(mocks.skipItem).toHaveBeenCalledOnce(); await act(() => pending.reject(new Error("raw"))); expect(renderer.root.findByProps({ role: "alert" }).children.join("")).toContain("could not be completed"); expect(renderer.root.findAllByType("button").find((button) => button.children.includes("Skip this import"))?.props.disabled).toBe(false);
  });
});
