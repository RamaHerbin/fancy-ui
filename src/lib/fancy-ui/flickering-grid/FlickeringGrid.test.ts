import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import FlickeringGrid from "./FlickeringGrid.svelte";

describe("FlickeringGrid", () => {
  afterEach(cleanup);

  it("renders a container div", () => {
    const { container } = render(FlickeringGrid);
    const div = container.querySelector("div");
    expect(div).toBeInTheDocument();
  });

  it("renders a canvas element inside the container", () => {
    const { container } = render(FlickeringGrid);
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
  });

  it("canvas has pointer-events-none class", () => {
    const { container } = render(FlickeringGrid);
    const canvas = container.querySelector("canvas");
    expect(canvas?.className).toContain("pointer-events-none");
  });

  it("applies custom class names to the container", () => {
    const { container } = render(FlickeringGrid, {
      props: { class: "my-grid" },
    });
    const div = container.querySelector("div");
    expect(div?.className).toContain("my-grid");
  });

  it("preserves base classes when custom class is added", () => {
    const { container } = render(FlickeringGrid, { props: { class: "extra" } });
    const div = container.querySelector("div");
    expect(div?.className).toContain("w-full");
    expect(div?.className).toContain("h-full");
  });
});
