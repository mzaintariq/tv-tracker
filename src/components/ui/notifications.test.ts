import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeAll, describe, expect, it } from "vitest";

import { NotificationProvider, useNotifications } from "./notifications";

function Trigger() {
  const { notify } = useNotifications();
  return createElement(
    "button",
    { onClick: () => notify("Show settings updated.") },
    "Notify",
  );
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

describe("NotificationProvider", () => {
  it("shows a dismissible top notification", async () => {
    let renderer: ReactTestRenderer | undefined;
    await act(() => {
      renderer = create(
        createElement(NotificationProvider, null, createElement(Trigger)),
      );
    });
    if (!renderer) throw new Error("Renderer unavailable.");
    const mounted = renderer;
    await act(() =>
      mounted.root.findByProps({ children: "Notify" }).props.onClick(),
    );
    expect(
      mounted.root.findByProps({ children: "Show settings updated." }),
    ).toBeDefined();
    await act(() =>
      mounted.root
        .findByProps({ "aria-label": "Dismiss notification" })
        .props.onClick(),
    );
    expect(mounted.root.findAllByProps({ role: "status" })).toHaveLength(0);
  });
});
