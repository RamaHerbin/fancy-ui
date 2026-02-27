import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import StarsBackground from "./StarsBackground.svelte";

describe("StarsBackground", () => {
  afterEach(cleanup);

  it("renders a container div", () => {
    const { container } = render(StarsBackground);
    const div = container.firstElementChild as HTMLElement;
    expect(div).toBeInTheDocument();
  });

  it("has overflow-hidden class", () => {
    const { container } = render(StarsBackground);
    const div = container.firstElementChild as HTMLElement;
    expect(div?.className).toContain("overflow-hidden");
  });

  it("renders three star layers", () => {
    const { container } = render(StarsBackground);
    const layers = container.querySelectorAll(".star-layer");
    expect(layers.length).toBe(3);
  });

  it("renders six star fields (2 per layer)", () => {
    const { container } = render(StarsBackground);
    const fields = container.querySelectorAll(".star-field");
    expect(fields.length).toBe(6);
  });

  it("applies custom class names", () => {
    const { container } = render(StarsBackground, {
      props: { class: "my-stars" },
    });
    const div = container.firstElementChild as HTMLElement;
    expect(div?.className).toContain("my-stars");
  });

  it("preserves base classes when custom class is added", () => {
    const { container } = render(StarsBackground, {
      props: { class: "extra" },
    });
    const div = container.firstElementChild as HTMLElement;
    expect(div?.className).toContain("overflow-hidden");
    expect(div?.className).toContain("size-full");
  });

  it("has radial gradient background class", () => {
    const { container } = render(StarsBackground);
    const div = container.firstElementChild as HTMLElement;
    expect(div?.className).toContain("bg-[radial-gradient");
  });
});
