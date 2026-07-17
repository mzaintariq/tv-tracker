import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ImportNotFound from "./not-found";

describe("import not-found state", () => {
  it("uses non-disclosing copy and links to the import list", () => {
    const html = renderToStaticMarkup(createElement(ImportNotFound));
    expect(html).toContain("Import not found");
    expect(html).toContain("may have been deleted or is no longer available");
    expect(html).toContain('href="/profile/import"');
    expect(html).not.toMatch(/another user|owner|exists globally/i);
  });
});
