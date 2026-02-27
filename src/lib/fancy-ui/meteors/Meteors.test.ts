import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import Meteors from "./Meteors.svelte";

describe("Meteors", () => {
  afterEach(cleanup);

  it("renders the default number of meteor spans (20)", () => {
    const { container } = render(Meteors);
    const spans = container.querySelectorAll("span.meteor");
    expect(spans.length).toBe(20);
  });

  it("renders a custom count of meteors", () => {
    const { container } = render(Meteors, { props: { count: 5 } });
    const spans = container.querySelectorAll("span.meteor");
    expect(spans.length).toBe(5);
  });

  it("renders zero meteors when count is 0", () => {
    const { container } = render(Meteors, { props: { count: 0 } });
    const spans = container.querySelectorAll("span.meteor");
    expect(spans.length).toBe(0);
  });

  it("applies custom class names to each meteor", () => {
    const { container } = render(Meteors, {
      props: { count: 3, class: "my-custom-class" },
    });
    const spans = container.querySelectorAll("span.meteor");
    spans.forEach((span) => {
      expect(span.className).toContain("my-custom-class");
    });
  });

  it("each meteor has a style attribute with left, animation-delay, and animation-duration", () => {
    const { container } = render(Meteors, { props: { count: 3 } });
    const spans = container.querySelectorAll("span.meteor");
    spans.forEach((span) => {
      const style = span.getAttribute("style") ?? "";
      expect(style).toContain("left:");
      expect(style).toContain("animation-delay:");
      expect(style).toContain("animation-duration:");
    });
  });

  it("preserves base classes when custom class is added", () => {
    const { container } = render(Meteors, {
      props: { count: 1, class: "extra" },
    });
    const span = container.querySelector("span.meteor")!;
    expect(span.className).toContain("absolute");
    expect(span.className).toContain("rounded-full");
  });
});
