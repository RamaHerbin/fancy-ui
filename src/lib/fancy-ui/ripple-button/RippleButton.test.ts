import { render, screen, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import RippleButton from "./RippleButton.svelte";

describe("RippleButton", () => {
  afterEach(cleanup);

  it("renders a button element", () => {
    render(RippleButton);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("has overflow-hidden class", () => {
    render(RippleButton);
    const button = screen.getByRole("button");
    expect(button.className).toContain("overflow-hidden");
  });

  it("has rounded-lg class", () => {
    render(RippleButton);
    const button = screen.getByRole("button");
    expect(button.className).toContain("rounded-lg");
  });

  it("sets --ripple-duration CSS custom property", () => {
    render(RippleButton, { props: { duration: 800 } });
    const button = screen.getByRole("button");
    expect(button.getAttribute("style")).toContain("--ripple-duration: 800ms");
  });

  it("applies custom class names", () => {
    render(RippleButton, { props: { class: "my-ripple" } });
    const button = screen.getByRole("button");
    expect(button.className).toContain("my-ripple");
  });

  it("preserves base classes when custom class is added", () => {
    render(RippleButton, { props: { class: "extra" } });
    const button = screen.getByRole("button");
    expect(button.className).toContain("overflow-hidden");
    expect(button.className).toContain("rounded-lg");
  });

  it("forwards native button attributes", () => {
    render(RippleButton, {
      props: { disabled: true, "aria-label": "Click me" },
    });
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-label", "Click me");
  });
});
