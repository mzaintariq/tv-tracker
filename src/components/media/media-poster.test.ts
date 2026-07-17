import { createElement } from "react";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => createElement("img", props),
}));

import { MediaPoster, posterFallback, resolvePosterSource } from "./media-poster";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

async function renderPoster(props: Partial<React.ComponentProps<typeof MediaPoster>> = {}): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(() => {
    renderer = create(createElement(MediaPoster, {
      source: "/poster.jpg",
      title: "The Example",
      alt: "The Example poster",
      sizes: "180px",
      ...props,
    }));
  });
  if (!renderer) throw new Error("Poster test renderer was not created.");
  return renderer;
}

function image(renderer: ReactTestRenderer): ReactTestInstance {
  return renderer.root.findByType("img");
}

describe("MediaPoster", () => {
  it("resolves TMDB paths and complete HTTPS URLs", () => {
    expect(resolvePosterSource("/poster.jpg", "w500")).toBe("https://image.tmdb.org/t/p/w500/poster.jpg");
    expect(resolvePosterSource("https://cdn.example.com/poster.jpg")).toBe("https://cdn.example.com/poster.jpg");
  });

  it.each([null, undefined, "", "   ", "http://example.com/poster.jpg", "javascript:alert(1)"])("renders a fallback for missing or unsafe source %s", async (source) => {
    const renderer = await renderPoster({ source });
    expect(renderer.root.findAllByType("img")).toHaveLength(0);
    expect(renderer.root.findByType("span").children).toEqual(["TE"]);
  });

  it("derives deterministic initials and supports a neutral override", async () => {
    expect(posterFallback("The Example")).toBe("TE");
    expect(posterFallback("Alien")).toBe("AL");
    expect(posterFallback("   ")).toBe("No poster");
    const renderer = await renderPoster({ source: null, fallbackLabel: "No poster" });
    expect(renderer.root.findByType("span").children).toEqual(["No poster"]);
  });

  it("preserves descriptive and intentionally empty alt text", async () => {
    const descriptive = await renderPoster();
    expect(image(descriptive).props.alt).toBe("The Example poster");
    const decorative = await renderPoster({ alt: "" });
    expect(image(decorative).props.alt).toBe("");
  });

  it("preserves caller classes, sizes, and loader behavior", async () => {
    const tmdb = await renderPoster({ className: "custom-image", sizes: "50vw" });
    expect(image(tmdb).props).toMatchObject({ className: "custom-image", sizes: "50vw", fill: true, unoptimized: false });
    const external = await renderPoster({ source: "https://cdn.example.com/poster.jpg" });
    expect(image(external).props.unoptimized).toBe(true);
  });

  it("falls back after an image error and does not retry the same URL", async () => {
    const renderer = await renderPoster();
    await act(() => image(renderer).props.onError());
    expect(renderer.root.findAllByType("img")).toHaveLength(0);
    await act(() => renderer.update(createElement(MediaPoster, { source: "/poster.jpg", title: "The Example", alt: "The Example poster", sizes: "180px" })));
    expect(renderer.root.findAllByType("img")).toHaveLength(0);
  });

  it("tries a genuinely changed source after a previous failure", async () => {
    const renderer = await renderPoster();
    await act(() => image(renderer).props.onError());
    await act(() => renderer.update(createElement(MediaPoster, { source: "/replacement.jpg", title: "The Example", alt: "The Example poster", sizes: "180px" })));
    expect(image(renderer).props.src).toBe("https://image.tmdb.org/t/p/w342/replacement.jpg");
  });
});
