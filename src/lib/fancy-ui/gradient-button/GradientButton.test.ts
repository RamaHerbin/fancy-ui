import { render, screen, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import GradientButton from "./GradientButton.svelte";

describe("GradientButton", () => {
  afterEach(cleanup);

  it("renders a button element", () => {
    render(GradientButton);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("applies default CSS custom properties", () => {
    render(GradientButton);
    const button = screen.getByRole("button");
    const style = button.getAttribute("style") ?? "";
    expect(style).toContain("--gb-duration: 2500ms");
    expect(style).toContain("--gb-border-width: 2px");
    expect(style).toContain("--gb-border-radius: 8px");
    expect(style).toContain("--gb-blur: 4px");
    expect(style).toContain("--gb-bg-color: #000");
  });

  it("applies custom colors", () => {
    render(GradientButton, { props: { colors: ["#ff0000", "#00ff00"] } });
    const button = screen.getByRole("button");
    expect(button.getAttribute("style")).toContain(
      "--gb-colors: #ff0000, #00ff00",
    );
  });

  it("applies custom duration", () => {
    render(GradientButton, { props: { duration: 5000 } });
    const button = screen.getByRole("button");
    expect(button.getAttribute("style")).toContain("--gb-duration: 5000ms");
  });

  it("applies custom borderWidth", () => {
    render(GradientButton, { props: { borderWidth: 4 } });
    const button = screen.getByRole("button");
    expect(button.getAttribute("style")).toContain("--gb-border-width: 4px");
  });

  it("applies custom class names", () => {
    render(GradientButton, { props: { class: "my-gradient" } });
    const button = screen.getByRole("button");
    expect(button.className).toContain("my-gradient");
  });

  it("preserves base classes when custom class is added", () => {
    render(GradientButton, { props: { class: "extra" } });
    const button = screen.getByRole("button");
    expect(button.className).toContain("gradient-button");
    expect(button.className).toContain("overflow-hidden");
  });

  it("contains gradient-border span", () => {
    render(GradientButton);
    const button = screen.getByRole("button");
    const border = button.querySelector(".gradient-border");
    expect(border).toBeInTheDocument();
    expect(border).toHaveAttribute("aria-hidden", "true");
  });

  it("contains gradient-content span", () => {
    render(GradientButton);
    const button = screen.getByRole("button");
    const content = button.querySelector(".gradient-content");
    expect(content).toBeInTheDocument();
  });

  it("forwards native button attributes", () => {
    render(GradientButton, { props: { disabled: true, type: "submit" } });
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("type", "submit");
  });
});
