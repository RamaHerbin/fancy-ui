import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import LineHoverLink from "./LineHoverLink.svelte";

describe("LineHoverLink", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders an anchor element", () => {
		const { container } = render(LineHoverLink, {
			props: { href: "/about" },
			context: new Map(),
		});
		expect(container.querySelector("a")).toBeTruthy();
	});

	it("applies the variant class", () => {
		const { container } = render(LineHoverLink, {
			props: { variant: "slide", href: "#" },
		});
		expect(container.querySelector("a.link-hover--slide")).toBeTruthy();
	});

	it("defaults to slide variant", () => {
		const { container } = render(LineHoverLink, { props: { href: "#" } });
		expect(container.querySelector("a.link-hover--slide")).toBeTruthy();
	});

	it("wraps children in a span for strike variant", () => {
		const { container } = render(LineHoverLink, { props: { variant: "strike", href: "#" } });
		expect(container.querySelector("a.link-hover--strike span")).toBeTruthy();
	});

	it("wraps children in a span for bounce variant", () => {
		const { container } = render(LineHoverLink, { props: { variant: "bounce", href: "#" } });
		expect(container.querySelector("a.link-hover--bounce span")).toBeTruthy();
	});

	it("renders arc SVG for arc variant", () => {
		const { container } = render(LineHoverLink, { props: { variant: "arc", href: "#" } });
		expect(container.querySelector("svg.link-hover__graphic--arc")).toBeTruthy();
	});

	it("renders scribble SVG for scribble variant", () => {
		const { container } = render(LineHoverLink, { props: { variant: "scribble", href: "#" } });
		expect(container.querySelector("svg.link-hover__graphic--scribble")).toBeTruthy();
	});

	it("does not render SVG for non-svg variants", () => {
		const { container } = render(LineHoverLink, { props: { variant: "slide", href: "#" } });
		expect(container.querySelector("svg")).toBeNull();
	});

	it("forwards href to the anchor", () => {
		const { container } = render(LineHoverLink, { props: { href: "/contact" } });
		expect(container.querySelector("a")?.getAttribute("href")).toBe("/contact");
	});

	it("applies additional class", () => {
		const { container } = render(LineHoverLink, {
			props: { class: "text-xl font-bold", href: "#" },
		});
		expect(container.querySelector("a.text-xl")).toBeTruthy();
	});
});
