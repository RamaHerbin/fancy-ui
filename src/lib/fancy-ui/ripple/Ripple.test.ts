import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import Ripple from "./Ripple.svelte";

describe("Ripple", () => {
  afterEach(cleanup);

  it("renders correct number of circles (default 7)", () => {
    const { container } = render(Ripple);
    const circles = container.querySelectorAll(".animate-ripple-circle");
    expect(circles.length).toBe(7);
  });

  it("renders with custom numberOfCircles", () => {
    const { container } = render(Ripple, { props: { numberOfCircles: 3 } });
    const circles = container.querySelectorAll(".animate-ripple-circle");
    expect(circles.length).toBe(3);
  });

  it("renders with numberOfCircles set to 10", () => {
    const { container } = render(Ripple, { props: { numberOfCircles: 10 } });
    const circles = container.querySelectorAll(".animate-ripple-circle");
    expect(circles.length).toBe(10);
  });

  it("applies circleClass to each circle", () => {
    const { container } = render(Ripple, {
      props: { numberOfCircles: 3, circleClass: "my-circle" },
    });
    const circles = container.querySelectorAll(".animate-ripple-circle");
    circles.forEach((circle) => {
      expect(circle.className).toContain("my-circle");
    });
  });

  it("applies custom class to container", () => {
    const { container } = render(Ripple, { props: { class: "my-ripple" } });
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper?.className).toContain("my-ripple");
  });

  it("preserves base classes on container", () => {
    const { container } = render(Ripple, { props: { class: "extra" } });
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper?.className).toContain("absolute");
    expect(wrapper?.className).toContain("inset-0");
  });

  it("last circle has dashed border style", () => {
    const { container } = render(Ripple, { props: { numberOfCircles: 5 } });
    const circles = container.querySelectorAll(".animate-ripple-circle");
    const lastCircle = circles[circles.length - 1] as HTMLElement;
    const style = lastCircle.getAttribute("style") ?? "";
    expect(style).toContain("border-style: dashed");
  });

  it("other circles have solid border style", () => {
    const { container } = render(Ripple, { props: { numberOfCircles: 5 } });
    const circles = container.querySelectorAll(".animate-ripple-circle");
    for (let i = 0; i < circles.length - 1; i++) {
      const style = (circles[i] as HTMLElement).getAttribute("style") ?? "";
      expect(style).toContain("border-style: solid");
    }
  });

  it("circle sizes match baseCircleSize + index * spaceBetweenCircle", () => {
    const baseCircleSize = 100;
    const spaceBetweenCircle = 50;
    const numberOfCircles = 4;
    const { container } = render(Ripple, {
      props: { baseCircleSize, spaceBetweenCircle, numberOfCircles },
    });
    const circles = container.querySelectorAll(".animate-ripple-circle");
    circles.forEach((circle, i) => {
      const expectedSize = baseCircleSize + i * spaceBetweenCircle;
      const style = (circle as HTMLElement).getAttribute("style") ?? "";
      expect(style).toContain(`width: ${expectedSize}px`);
      expect(style).toContain(`height: ${expectedSize}px`);
    });
  });

  it("circle sizes use defaults (210 base, 70 spacing)", () => {
    const { container } = render(Ripple, { props: { numberOfCircles: 3 } });
    const circles = container.querySelectorAll(".animate-ripple-circle");
    const expectedSizes = [210, 280, 350];
    circles.forEach((circle, i) => {
      const style = (circle as HTMLElement).getAttribute("style") ?? "";
      expect(style).toContain(`width: ${expectedSizes[i]}px`);
      expect(style).toContain(`height: ${expectedSizes[i]}px`);
    });
  });
});
