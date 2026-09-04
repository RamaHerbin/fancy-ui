import { act, render, cleanup } from "@testing-library/react";
import { Profiler, useLayoutEffect } from "react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { TracingBeam } from "./TracingBeam.js";

describe("TracingBeam", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("renders container div", () => {
		const { container } = render(<TracingBeam />);
		const div = container.firstElementChild as HTMLElement;
		expect(div).toBeInTheDocument();
		expect(div.tagName).toBe("DIV");
	});

	it("renders SVG element", () => {
		const { container } = render(<TracingBeam />);
		const svg = container.querySelector("svg");
		expect(svg).toBeInTheDocument();
	});

	it("SVG has aria-hidden attribute", () => {
		const { container } = render(<TracingBeam />);
		const svg = container.querySelector("svg");
		expect(svg?.getAttribute("aria-hidden")).toBe("true");
	});

	it("renders circle indicator", () => {
		const { container } = render(<TracingBeam />);
		const outerCircle = container.querySelector(".rounded-full.border");
		expect(outerCircle).toBeInTheDocument();
		const innerCircle = outerCircle?.querySelector(".rounded-full");
		expect(innerCircle).toBeInTheDocument();
	});

	it("applies custom class", () => {
		const { container } = render(<TracingBeam className="my-beam" />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("my-beam");
	});

	it("preserves base classes when custom class is added", () => {
		const { container } = render(<TracingBeam className="extra" />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("relative");
		expect(div?.className).toContain("mx-auto");
		expect(div?.className).toContain("max-w-4xl");
	});

	it("renders gradient definition in SVG", () => {
		const { container } = render(<TracingBeam />);
		// Looked up by tag, not by id: the id is minted per instance and carries
		// React's own delimiters, which are illegal in an unescaped selector.
		const gradient = container.querySelector("svg linearGradient");
		expect(gradient).toBeInTheDocument();
	});

	it("gives each instance its own gradient id, referenced by its own stroke", () => {
		const { container } = render(
			<>
				<TracingBeam />
				<TracingBeam />
			</>
		);

		const ids = [...container.querySelectorAll("svg linearGradient")].map((node) => node.id);
		expect(ids.length).toBe(2);
		const [first, second] = ids;
		expect(first).not.toBe("");
		expect(second).not.toBe(first);

		// Each beam's animated path references the gradient of its OWN svg, so the
		// second beam is not driven by the first one's spring.
		const strokes = [...container.querySelectorAll("svg path[stroke-width]")].map((path) =>
			path.getAttribute("stroke")
		);
		expect(strokes).toEqual([`url(#${first})`, `url(#${second})`]);
	});

	it("renders two path elements in SVG", () => {
		const { container } = render(<TracingBeam />);
		const paths = container.querySelectorAll("svg path");
		expect(paths.length).toBe(2);
	});

	/** A rect at `y`, complete enough for `getBoundingClientRect`'s consumers. */
	function rectAt(y: number): DOMRect {
		return {
			x: 0,
			y,
			top: y,
			bottom: y + 1000,
			left: 0,
			right: 800,
			width: 800,
			height: 1000,
			toJSON: () => ({}),
		} as DOMRect;
	}

	it("measures in the layout phase, so the first painted frame carries the beam", () => {
		// The source measures from `onMount`, which is flushed before the browser
		// paints; a passive effect would run after it and show one frame with a
		// zero-height svg and the dot in its at-top colours. The phase is observed
		// through the order the measurement lands in relative to a later sibling's
		// layout effect: in the layout phase the beam measures first.
		const order: string[] = [];
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => {
			order.push("beam");
			return rectAt(-100);
		});
		const offsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
		Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
			configurable: true,
			get: () => 500,
		});

		function Probe() {
			useLayoutEffect(() => {
				order.push("probe-layout");
			}, []);
			return null;
		}

		try {
			const { container } = render(
				<>
					<TracingBeam />
					<Probe />
				</>
			);

			expect(order[0]).toBe("beam");
			expect(order).toContain("probe-layout");
			expect(order.indexOf("beam")).toBeLessThan(order.indexOf("probe-layout"));
			// And the beam is at its measured height with no frame to wait for.
			const svg = container.querySelector("svg");
			expect(svg?.getAttribute("height")).toBe("500");
		} finally {
			if (offsetHeight) {
				Object.defineProperty(HTMLElement.prototype, "offsetHeight", offsetHeight);
			} else {
				delete (HTMLElement.prototype as unknown as Record<string, unknown>).offsetHeight;
			}
		}
	});

	it("does not re-render while scrolling below the threshold it already crossed", () => {
		// The raw progress is a fresh float per scroll event but feeds only the
		// three at-top expressions, so a scroll that does not cross the threshold
		// must cost zero renders — the same DOM-write frequency as the source.
		let y = -100;
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => rectAt(y));

		let commits = 0;
		render(
			<Profiler
				id="tracing-beam"
				onRender={() => {
					commits += 1;
				}}
			>
				<TracingBeam />
			</Profiler>
		);

		// One warm-up event: React skips its eager bail-out on the first update that
		// follows the mount update, so the count is taken from the second event on.
		function scroll() {
			y -= 10;
			act(() => {
				window.dispatchEvent(new Event("scroll"));
			});
		}

		scroll();
		commits = 0;
		for (let i = 0; i < 5; i += 1) scroll();

		expect(commits).toBe(0);
	});
});
