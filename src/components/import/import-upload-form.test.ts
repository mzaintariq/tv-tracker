import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
import { ImportUploadForm } from "./import-upload-form";

async function mount(): Promise<ReactTestRenderer> { let renderer: ReactTestRenderer | undefined; await act(() => { renderer = create(createElement(ImportUploadForm, { mode: "analyze" })); }); if (!renderer) throw new Error("Renderer unavailable."); return renderer; }
async function chooseFile(renderer: ReactTestRenderer): Promise<void> { await act(() => renderer.root.findByType("input").props.onChange({ target: { files: [{}] } })); }

beforeEach(() => { vi.clearAllMocks(); globalThis.IS_REACT_ACT_ENVIRONMENT = true; });

describe("ImportUploadForm response handling", () => {
  it("navigates after a valid Analyze success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ importId: "created" }), { status: 200 })));
    const renderer = await mount(); await chooseFile(renderer);
    expect(router.push).toHaveBeenCalledWith("/profile/import/created"); expect(renderer.root.findByType("input").props.disabled).toBe(false);
  });

  it("preserves a known safe validation error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "zip_compressed_too_large", error: "The ZIP exceeds 3.5 MB." }), { status: 400 })));
    const renderer = await mount(); await chooseFile(renderer);
    expect(renderer.root.findByProps({ role: "alert" }).children).toContain("The ZIP exceeds 3.5 MB."); expect(router.push).not.toHaveBeenCalled();
  });

  it.each([
    new Response("<html>private proxy failure</html>", { status: 502 }),
    new Response(null, { status: 502 }),
    new Response("{bad", { status: 502 }),
  ])("uses safe feedback for HTML, empty, and malformed responses", async (response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response)); const renderer = await mount(); await chooseFile(renderer); const message = renderer.root.findByProps({ role: "alert" }).children.join(""); expect(message).toBe("The import could not be uploaded. Please try again."); expect(message).not.toContain("private proxy");
  });

  it("clears pending and remains in place after network rejection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("raw network stack"))); const renderer = await mount(); await chooseFile(renderer); expect(renderer.root.findByType("input").props.disabled).toBe(false); expect(renderer.root.findByProps({ role: "alert" }).children.join("")).toBe("The import could not be uploaded. Please try again."); expect(router.push).not.toHaveBeenCalled();
  });
});
