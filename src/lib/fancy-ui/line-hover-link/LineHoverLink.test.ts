import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import LineHoverLink from "./LineHoverLink.svelte";
import { sound } from "../sound/sound.svelte.js";

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

	it("applies the ink variant class", () => {
		const { container } = render(LineHoverLink, { props: { variant: "ink", href: "#" } });
		expect(container.querySelector("a.link-hover--ink")).toBeTruthy();
	});

	it("does not wrap children in a span for the ink variant", () => {
		const { container } = render(LineHoverLink, { props: { variant: "ink", href: "#" } });
		expect(container.querySelector("a.link-hover--ink span")).toBeNull();
	});

	it("does not render an SVG for the ink variant", () => {
		const { container } = render(LineHoverLink, { props: { variant: "ink", href: "#" } });
		expect(container.querySelector("svg")).toBeNull();
	});

	// Every `transition` and `animation` in this component now lives inside
	// `@media (prefers-reduced-motion: no-preference)`; the resting and hover
	// states stay outside it, so the underline still appears, it just stops
	// travelling. jsdom evaluates neither the media query nor the pseudo-
	// elements that carry it, so what a test can pin is that the preference
	// changes nothing about the markup the CSS selects on — no variant is
	// swapped out, no graphic is dropped, and the SVG stroke-draw variants
	// still ship the path that snaps to fully drawn.
	it("reduced motion: every variant still renders the markup its effect hangs off", () => {
		const real = window.matchMedia;
		window.matchMedia = ((query: string) => ({
			...real(query),
			matches: true,
		})) as typeof window.matchMedia;

		try {
			for (const variant of ["slide", "pulse", "sweep", "bounce", "ink"] as const) {
				const { container, unmount } = render(LineHoverLink, { props: { variant, href: "#" } });
				expect(container.querySelector(`a.link-hover--${variant}`)).toBeTruthy();
				unmount();
			}

			for (const variant of ["arc", "scribble"] as const) {
				const { container, unmount } = render(LineHoverLink, { props: { variant, href: "#" } });
				const path = container.querySelector(`svg.link-hover__graphic--${variant} path`);
				expect(path?.getAttribute("pathLength")).toBe("1");
				unmount();
			}
		} finally {
			window.matchMedia = real;
		}
	});

	describe("sound", () => {
		let play: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			play = vi.spyOn(sound, "play").mockImplementation(() => {});
		});

		afterEach(() => {
			play.mockRestore();
		});

		it("plays the press cue exactly once when the link is activated, with sound enabled", async () => {
			const { container } = render(LineHoverLink, { props: { href: "#", sound: true } });

			await fireEvent.click(container.querySelector("a")!);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const { container } = render(LineHoverLink, { props: { href: "#" } });

			await fireEvent.click(container.querySelector("a")!);

			expect(play).not.toHaveBeenCalled();
		});

		it("never preventDefaults the click — navigation stays untouched", async () => {
			const { container } = render(LineHoverLink, { props: { href: "#", sound: true } });
			const el = container.querySelector("a")!;
			const event = new MouseEvent("click", { bubbles: true, cancelable: true });

			el.dispatchEvent(event);

			expect(event.defaultPrevented).toBe(false);
			expect(play).toHaveBeenCalledTimes(1);
		});

		it("plays nothing on hover or focus — the CSS underline animation stays silent", async () => {
			const { container } = render(LineHoverLink, { props: { href: "#", sound: true } });
			const el = container.querySelector("a")!;

			await fireEvent.mouseEnter(el);
			await fireEvent.focus(el);

			expect(play).not.toHaveBeenCalled();
		});
	});
});
