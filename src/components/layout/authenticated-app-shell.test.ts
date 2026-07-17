import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AuthenticatedAppShell } from "./authenticated-app-shell";

function renderShell(children: React.ReactNode = "Page content"): string {
  return renderToStaticMarkup(
    createElement(AuthenticatedAppShell, {
      desktopNavigation: createElement("nav", { "aria-label": "Desktop" }),
      mobileNavigation: createElement("nav", { "aria-label": "Mobile" }),
      themeSync: createElement("span", { "data-theme-sync": true }),
    }, children),
  );
}

describe("authenticated application shell", () => {
  it("renders one stable main landmark and one preceding skip link", () => {
    const html = renderShell();
    const skipLink = '<a class="skip-link" href="#main-content">Skip to main content</a>';

    expect(html.match(/<main\b/g)).toHaveLength(1);
    expect(html.match(/id="main-content"/g)).toHaveLength(1);
    expect(html).toContain('<main id="main-content" tabindex="-1"');
    expect(html).toContain(skipLink);
    expect(html.indexOf(skipLink)).toBeLessThan(html.indexOf("<nav"));
    expect(html.indexOf(skipLink)).toBeLessThan(html.indexOf("<main"));
  });
});
