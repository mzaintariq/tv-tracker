import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { ShowSubnav } from "@/components/shows/show-subnav";

describe("ShowSubnav", () => {
  it("uses a sticky compact navigation with an exposed current view", () => {
    const html = renderToStaticMarkup(createElement(ShowSubnav, { current: "upcoming" }));
    expect(html).toContain("sticky");
    expect(html).toContain("safe-area-top");
    expect(html).toContain('aria-label="TV Shows views"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="/shows"');
    expect(html).toContain('href="/shows/upcoming"');
  });

  it("slides a shared selection indicator and respects reduced-motion styling", () => {
    const source = readFileSync("src/components/shows/show-subnav.tsx", "utf8");
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(source).toContain("transition-transform");
    expect(source).toContain('selected === "upcoming" ? "translate-x-full" : "translate-x-0"');
    expect(source).toContain("onClick={() => setSelection({ route: current, visual: item.value })}");
    expect(css).toContain('[class*="transition-"]');
  });
});
