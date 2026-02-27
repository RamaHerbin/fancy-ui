import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import BorderBeam from "./BorderBeam.svelte";

describe("BorderBeam", () => {
  afterEach(cleanup);

  it("renders a div element", () => {
    const { container } = render(BorderBeam);
    const div = container.querySelector(".border-beam");
    expect(div).toBeInTheDocument();
  });

  it("applies default CSS custom properties", () => {
    const { container } = render(BorderBeam);
    const div = container.querySelector(".border-beam") as HTMLElement;
    const style = div.getAttribute("style") ?? "";
    expect(style).toContain("--border-beam-size: 200");
    expect(style).toContain("--border-beam-duration: 15s");
    expect(style).toContain("--border-beam-anchor: 90");
    expect(style).toContain("--border-beam-border-width: 1.5");
    expect(style).toContain("--border-beam-color-from: #ffaa40");
    expect(style).toContain("--border-beam-color-to: #9c40ff");
    expect(style).toContain("--border-beam-delay: 0s");
  });

  it("applies custom size", () => {
    const { container } = render(BorderBeam, { props: { size: 300 } });
    const div = container.querySelector(".border-beam") as HTMLElement;
    expect(div.getAttribute("style")).toContain("--border-beam-size: 300");
  });

  it("applies custom duration", () => {
    const { container } = render(BorderBeam, { props: { duration: 5 } });
    const div = container.querySelector(".border-beam") as HTMLElement;
    expect(div.getAttribute("style")).toContain("--border-beam-duration: 5s");
  });

  it("applies custom colors", () => {
    const { container } = render(BorderBeam, {
      props: { colorFrom: "#ff0000", colorTo: "#00ff00" },
    });
    const div = container.querySelector(".border-beam") as HTMLElement;
    const style = div.getAttribute("style") ?? "";
    expect(style).toContain("--border-beam-color-from: #ff0000");
    expect(style).toContain("--border-beam-color-to: #00ff00");
  });

  it("applies custom delay", () => {
    const { container } = render(BorderBeam, { props: { delay: 3 } });
    const div = container.querySelector(".border-beam") as HTMLElement;
    expect(div.getAttribute("style")).toContain("--border-beam-delay: 3s");
  });

  it("applies custom borderWidth", () => {
    const { container } = render(BorderBeam, { props: { borderWidth: 3 } });
    const div = container.querySelector(".border-beam") as HTMLElement;
    expect(div.getAttribute("style")).toContain(
      "--border-beam-border-width: 3",
    );
  });

  it("applies custom class names", () => {
    const { container } = render(BorderBeam, { props: { class: "my-beam" } });
    const div = container.querySelector(".border-beam");
    expect(div?.className).toContain("my-beam");
  });

  it("preserves base classes when custom class is added", () => {
    const { container } = render(BorderBeam, { props: { class: "extra" } });
    const div = container.querySelector(".border-beam");
    expect(div?.className).toContain("pointer-events-none");
    expect(div?.className).toContain("absolute");
    expect(div?.className).toContain("inset-0");
  });
});
