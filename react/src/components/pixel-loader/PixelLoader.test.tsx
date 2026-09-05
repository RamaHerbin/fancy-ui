import { render, cleanup, screen, within } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { PixelLoader } from "./PixelLoader.js";

function pixels(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(".ft-pixel"));
}

// React writes inline styles with a trailing semicolon; drop it so the delays
// can be compared exactly rather than by substring (which would let "1s" match
// "10s").
function inlineStyle(el: HTMLElement): string {
  return (el.getAttribute("style") ?? "").replace(/;\s*$/, "");
}

describe("PixelLoader", () => {
  afterEach(cleanup);

  it("renders rows * cols pixels at the default 5x5 size", () => {
    const { container } = render(<PixelLoader />);
    expect(pixels(container)).toHaveLength(25);
  });

  it("renders rows * cols pixels for a custom grid size", () => {
    const { container } = render(<PixelLoader cols={8} rows={3} />);
    expect(pixels(container)).toHaveLength(24);
  });

  it("exposes a live status region announcing the label", () => {
    render(<PixelLoader label="Thinking" />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    // role="status" takes no name from its content, so the label lives in the
    // region's text where assistive tech will announce it.
    expect(within(status).getByText("Thinking")).toHaveClass("sr-only");
  });

  it("defaults the announced label to Loading", () => {
    render(<PixelLoader />);
    expect(within(screen.getByRole("status")).getByText("Loading")).toBeInTheDocument();
  });

  it("merges custom class names onto the root", () => {
    const { container } = render(<PixelLoader className="my-loader" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("my-loader");
    expect(root.className).toContain("inline-grid");
  });

  it("reflects cellSize and gap in the root inline style", () => {
    const { container } = render(<PixelLoader cols={4} cellSize={10} gap={3} />);
    const style = (container.firstElementChild as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("grid-template-columns: repeat(4, 10px)");
    expect(style).toContain("grid-auto-rows: 10px");
    expect(style).toContain("gap: 3px");
  });

  it("derives a deterministic diagonal delay per pixel", () => {
    // 2x2 grid, speed 4 → span 4, step 1s. Anti-diagonals give 0, 1, 1, 2.
    const { container } = render(<PixelLoader cols={2} rows={2} speed={4} />);
    const delays = pixels(container).map(inlineStyle);
    expect(delays).toEqual([
      "animation-delay: 0s",
      "animation-delay: 1s",
      "animation-delay: 1s",
      "animation-delay: 2s",
    ]);
  });

  it("renders the same delays on every mount", () => {
    const first = render(<PixelLoader cols={3} rows={3} />);
    const a = pixels(first.container).map(inlineStyle);
    cleanup();
    const second = render(<PixelLoader cols={3} rows={3} />);
    const b = pixels(second.container).map(inlineStyle);
    expect(b).toEqual(a);
  });

  it("keeps a positive animation duration when speed is zero or negative", () => {
    const { container } = render(<PixelLoader speed={0} />);
    const style = (container.firstElementChild as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("--ft-pixel-speed: 0.01s");
  });

  it("passes the color prop through as the pixel colour custom property", () => {
    const { container } = render(<PixelLoader color="#22d3ee" />);
    const style = (container.firstElementChild as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("--ft-pixel-cell-color: #22d3ee");
  });
});
