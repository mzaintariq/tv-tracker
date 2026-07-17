import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LoginForm } from "./login-form";

describe("login form accessibility", () => {
  it("associates authentication errors with the labelled required email field", () => {
    const html = renderToStaticMarkup(createElement(LoginForm, { nextPath: "/shows", initialError: "Sign-in failed." }));
    expect(html).toContain('<label for="login-email"');
    expect(html).toContain('id="login-email"');
    expect(html).toContain('required=""');
    expect(html).toContain('aria-describedby="login-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('id="login-error"');
    expect(html).toContain('role="alert"');
  });
});
