import { render, screen, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import RainbowButton from "./RainbowButton.svelte";

describe("RainbowButton", () => {
  afterEach(cleanup);

  it("renders a button element by default", () => {
    render(RainbowButton);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders an anchor element when href is provided", () => {
    render(RainbowButton, { props: { href: "/test" } });
    expect(screen.getByRole("link")).toBeInTheDocument();
  });

  it("applies the href to the anchor element", () => {
    render(RainbowButton, { props: { href: "/test" } });
    expect(screen.getByRole("link")).toHaveAttribute("href", "/test");
  });

  it("sets the --rainbow-speed CSS custom property", () => {
    render(RainbowButton, { props: { speed: 5 } });
    const button = screen.getByRole("button");
    expect(button.getAttribute("style")).toContain("--rainbow-speed: 5s");
  });

  it("uses default speed of 2s", () => {
    render(RainbowButton);
    const button = screen.getByRole("button");
    expect(button.getAttribute("style")).toContain("--rainbow-speed: 2s");
  });

  it("applies custom class names", () => {
    render(RainbowButton, { props: { class: "my-custom" } });
    const button = screen.getByRole("button");
    expect(button.className).toContain("my-custom");
  });

  it("preserves base classes when custom class is added", () => {
    render(RainbowButton, { props: { class: "extra" } });
    const button = screen.getByRole("button");
    expect(button.className).toContain("rainbow-button");
    expect(button.className).toContain("rounded-xl");
  });

  it("supports disabled state on button", () => {
    render(RainbowButton, { props: { disabled: true } });
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it('sets type="button" by default', () => {
    render(RainbowButton);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("allows custom type attribute", () => {
    render(RainbowButton, { props: { type: "submit" } });
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });
});
