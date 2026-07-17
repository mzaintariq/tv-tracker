import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CandidateCard, candidatesForDisplay } from "./candidate-card";

describe("candidate card", () => {
  it("renders poster, title, year, and action", () => {
    const html = renderToStaticMarkup(createElement(CandidateCard, { candidate: { id: 12, title: "Example", year: 2021, posterPath: "/poster.jpg" }, disabled: false, onUse: () => undefined }));
    expect(html).toContain("Example"); expect(html).toContain("2021"); expect(html).toContain("Use this"); expect(html).toContain('aria-label="Use Example as the match"'); expect(html).toContain("poster.jpg");
  });
  it("renders a safe missing-poster placeholder", () => {
    expect(renderToStaticMarkup(createElement(CandidateCard, { candidate: { id: 12, title: "Example" }, disabled: false, onUse: () => undefined }))).toContain("No poster");
  });
  it("supports older ID-only candidate payloads", () => {
    expect(candidatesForDisplay([12], []).map((item) => item.id)).toEqual([12]);
  });
});
