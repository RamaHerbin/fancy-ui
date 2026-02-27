import { render, cleanup } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import TracingBeam from "./TracingBeam.svelte";

describe("TracingBeam", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders container div", () => {
    const { container } = render(TracingBeam);
    const div = container.firstElementChild as HTMLElement;
    expect(div).toBeInTheDocument();
    expect(div.tagName).toBe("DIV");
  });

  it("renders SVG element", () => {
    const { container } = render(TracingBeam);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("SVG has aria-hidden attribute", () => {
    const { container } = render(TracingBeam);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders circle indicator", () => {
    const { container } = render(TracingBeam);
    const outerCircle = container.querySelector(".rounded-full.border");
    expect(outerCircle).toBeInTheDocument();
    const innerCircle = outerCircle?.querySelector(".rounded-full");
    expect(innerCircle).toBeInTheDocument();
  });

  it("applies custom class", () => {
    const { container } = render(TracingBeam, { props: { class: "my-beam" } });
    const div = container.firstElementChild as HTMLElement;
    expect(div?.className).toContain("my-beam");
  });

  it("preserves base classes when custom class is added", () => {
    const { container } = render(TracingBeam, { props: { class: "extra" } });
    const div = container.firstElementChild as HTMLElement;
    expect(div?.className).toContain("relative");
    expect(div?.className).toContain("mx-auto");
    expect(div?.className).toContain("max-w-4xl");
  });

  it("renders gradient definition in SVG", () => {
    const { container } = render(TracingBeam);
    const gradient = container.querySelector("#tracing-beam-gradient");
    expect(gradient).toBeInTheDocument();
  });

  it("renders two path elements in SVG", () => {
    const { container } = render(TracingBeam);
    const paths = container.querySelectorAll("svg path");
    expect(paths.length).toBe(2);
  });
});
