import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProgressBar } from "./progress-bar";

describe("show progress semantics", () => {
  it("provides a complete progressbar contract", () => {
    const html = renderToStaticMarkup(createElement(ProgressBar, { progress: { state: "partial", watched: 3, total: 10, percentage: 30 } }));
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-label="Show watch progress"');
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="100"');
    expect(html).toContain('aria-valuenow="30"');
  });
});
