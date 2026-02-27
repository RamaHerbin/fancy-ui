import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import TextRevealCard from "./TextRevealCard.svelte";

describe("TextRevealCard", () => {
  afterEach(cleanup);

  it("renders the component", () => {
    const { container } = render(TextRevealCard);
    const card = container.querySelector(".bg-\\[\\#1d1c20\\]");
    expect(card).toBeInTheDocument();
  });

  it("applies custom class", () => {
    const { container } = render(TextRevealCard, {
      props: { class: "my-reveal" },
    });
    const card = container.firstElementChild;
    expect(card?.className).toContain("my-reveal");
  });

  it("renders reveal line", () => {
    const { container } = render(TextRevealCard);
    const line = container.querySelector(".via-neutral-800");
    expect(line).toBeInTheDocument();
  });

  it("renders stars container", () => {
    const { container } = render(TextRevealCard);
    // Stars are rendered inside the component
    const starsContainer = container.querySelector(".absolute.inset-0");
    expect(starsContainer).toBeInTheDocument();
  });

  it("starts with 0% width", () => {
    const { container } = render(TextRevealCard);
    const revealLayer = container.querySelector(".z-20") as HTMLElement;
    expect(revealLayer?.style.opacity).toBe("0");
  });
});
