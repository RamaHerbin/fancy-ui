import { act, render, cleanup } from "@testing-library/react";
import { Profiler, useLayoutEffect, useRef } from "react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { TracingBeam } from "./TracingBeam.js";

/** A rect at `top` with the given height; enough for the component's reads. */
function rect(top: number, height: number): DOMRect {
	return {
		x: 0,
		y: top,
		top,
		bottom: top + height,
		left: 0,
		right: 600,
		width: 600,
		height,
		toJSON: () => ({}),
	} as DOMRect;
}

/** The Svelte test's headed fixture: two headings with a paragraph each. */
function Headed({ markers = true }: { markers?: boolean }) {
	return (
		<TracingBeam markers={markers}>
			<h2 data-heading="a">First</h2>
			<p>Some text.</p>
			<h2 data-heading="b">Second</h2>
			<p>More text.</p>
		</TracingBeam>
	);
}

/**
 * Content 1000px tall starting 100px below the viewport top; headings at
 * 150px and 700px from the content's top. Reading line = 38% of 1000px =
 * 380px → the lamp is at 280px: the first heading is behind it, the second ahead.
 */
function layoutHeaded() {
	Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
	vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
		this: HTMLElement
	) {
		if (this.classList.contains("tb-content")) return rect(100, 1000);
		if (this.dataset.heading === "a") return rect(240, 20);
		if (this.dataset.heading === "b") return rect(790, 20);
		return rect(0, 0);
	});
}

/** Reduced motion: the lamp lands on the reading line without a spring. */
function preferReducedMotion() {
	window.matchMedia = ((query: string) => ({
		matches: query.includes("prefers-reduced-motion"),
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	})) as unknown as typeof window.matchMedia;
}

/** A reduced-motion query whose answer the test can flip, firing `change`. */
function controllableReducedMotion(initial: boolean) {
	let matches = initial;
	const listeners = new Set<(event: { matches: boolean }) => void>();
	const mql = (query: string) => ({
		get matches() {
			return query.includes("prefers-reduced-motion") && matches;
		},
		media: query,
		onchange: null,
		addEventListener: (_: string, fn: (event: { matches: boolean }) => void) => listeners.add(fn),
		removeEventListener: (_: string, fn: (event: { matches: boolean }) => void) =>
			listeners.delete(fn),
		addListener: () => {},
		removeListener: () => {},
		dispatchEvent: () => false,
	});
	window.matchMedia = mql as unknown as typeof window.matchMedia;
	return (next: boolean) => {
		matches = next;
		for (const fn of [...listeners]) fn({ matches: next });
	};
}

describe("TracingBeam", () => {
	const originalMatchMedia = window.matchMedia;
	const originalInnerHeight = Object.getOwnPropertyDescriptor(window, "innerHeight");

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
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		window.matchMedia = originalMatchMedia;
		if (originalInnerHeight) Object.defineProperty(window, "innerHeight", originalInnerHeight);
	});

	it("renders the wrapper with its base classes plus the custom one", () => {
		const { container } = render(<TracingBeam className="my-beam" />);
		const root = container.firstElementChild as HTMLElement;
		expect(root.tagName).toBe("DIV");
		expect(root.className).toContain("my-beam");
		expect(root.className).toContain("relative");
		expect(root.className).toContain("mx-auto");
		expect(root.className).toContain("max-w-4xl");
	});

	it("keeps the rail, the lamp and the markers out of the accessibility tree", () => {
		const { container } = render(<TracingBeam />);
		const gutter = container.querySelector(".tb-gutter");
		expect(gutter?.getAttribute("aria-hidden")).toBe("true");
		expect(container.querySelector("[data-tracing-beam-head]")).toBeInTheDocument();
	});

	it("writes the lamp's position as a custom property instead of re-rendering markup", () => {
		const { container } = render(<TracingBeam />);
		const root = container.firstElementChild as HTMLElement;
		expect(root.style.getPropertyValue("--tb-progress")).toMatch(/px$/);
	});

	it("passes the accent through to the CSS hook", () => {
		const { container } = render(<TracingBeam accent="tomato" />);
		const root = container.firstElementChild as HTMLElement;
		expect(root.style.getPropertyValue("--tracing-beam-accent")).toBe("tomato");
	});

	it("draws one marker per heading, lit once the lamp has reached it", () => {
		layoutHeaded();
		preferReducedMotion();

		const { container } = render(<Headed />);
		const markers = container.querySelectorAll("[data-tracing-beam-marker]");
		expect(markers.length).toBe(2);
		expect(markers[0]?.getAttribute("data-lit")).toBe("true");
		expect(markers[1]?.getAttribute("data-lit")).toBe("false");
		const root = container.firstElementChild as HTMLElement;
		expect(root.style.getPropertyValue("--tb-progress")).toBe("280px");
		expect(root.getAttribute("data-motion")).toBe("reduced");
	});

	it("draws no marker when `markers` is off", () => {
		const { container } = render(<Headed markers={false} />);
		expect(container.querySelectorAll("[data-tracing-beam-marker]").length).toBe(0);
	});

	it("re-reads the layout when `markers` is switched on after mount", () => {
		layoutHeaded();
		const { container, rerender } = render(<Headed markers={false} />);
		expect(container.querySelectorAll("[data-tracing-beam-marker]").length).toBe(0);
		rerender(<Headed markers={true} />);
		expect(container.querySelectorAll("[data-tracing-beam-marker]").length).toBe(2);
	});

	it("places the lamp before the browser paints", () => {
		// A parent layout effect runs in the same commit as the child's, after
		// it and before any passive effect — so what it reads here is what the
		// first painted frame shows.
		layoutHeaded();
		preferReducedMotion();
		let progressAtPaint: string | undefined;

		function Probe() {
			const ref = useRef<HTMLDivElement | null>(null);
			useLayoutEffect(() => {
				const root = ref.current?.firstElementChild as HTMLElement;
				progressAtPaint = root.style.getPropertyValue("--tb-progress");
			}, []);
			return (
				<div ref={ref}>
					<Headed />
				</div>
			);
		}

		render(<Probe />);
		expect(progressAtPaint).toBe("280px");
	});

	it("does not re-render while scrolling between two markers", () => {
		// The lamp's position is a fresh float per scroll event and feeds only
		// the custom property, so a scroll that lights no new marker must cost
		// zero renders — the same DOM-write frequency as the source.
		let frames: FrameRequestCallback[] = [];
		vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
			frames.push(cb);
			return frames.length;
		});
		vi.stubGlobal("cancelAnimationFrame", () => {});
		Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
		let top = 100;
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
			this: HTMLElement
		) {
			if (this.classList.contains("tb-content")) return rect(top, 1000);
			if (this.dataset.heading === "a") return rect(top + 140, 20);
			if (this.dataset.heading === "b") return rect(top + 690, 20);
			return rect(0, 0);
		});
		preferReducedMotion();

		let commits = 0;
		const { container } = render(
			<Profiler
				id="tracing-beam"
				onRender={() => {
					commits += 1;
				}}
			>
				<Headed />
			</Profiler>
		);

		function scroll(by: number) {
			top -= by;
			act(() => {
				window.dispatchEvent(new Event("scroll"));
				const pending = frames;
				frames = [];
				for (const cb of pending) cb(0);
			});
		}

		// One warm-up event: React skips its eager bail-out on the first update that
		// follows the mount update, so the count is taken from the second event on.
		scroll(10);
		commits = 0;
		for (let i = 0; i < 5; i += 1) scroll(10);
		expect(commits).toBe(0);

		const root = container.firstElementChild as HTMLElement;
		expect(root.style.getPropertyValue("--tb-progress")).toBe("340px");

		// Crossing the second marker is a markup change, and the one render it costs.
		scroll(400);
		expect(commits).toBe(1);
		const markers = container.querySelectorAll("[data-tracing-beam-marker]");
		expect(markers[1]?.getAttribute("data-lit")).toBe("true");
	});

	it("removes its listeners and cancels its frame on unmount", () => {
		const cancel = vi.fn();
		vi.stubGlobal("requestAnimationFrame", () => 7);
		vi.stubGlobal("cancelAnimationFrame", cancel);
		const remove = vi.spyOn(window, "removeEventListener");
		const { unmount } = render(<Headed />);
		unmount();
		const types = remove.mock.calls.map((c) => c[0]);
		expect(types).toContain("scroll");
		expect(types).toContain("resize");
		expect(cancel).toHaveBeenCalledWith(7);
	});

	it("snaps the lamp and stops the spring when reduced motion turns on mid-flight", async () => {
		layoutHeaded();
		const setReduced = controllableReducedMotion(false);
		// The spring never gets a frame: the lamp stays where it started.
		vi.stubGlobal("requestAnimationFrame", () => 7);
		const cancel = vi.fn();
		vi.stubGlobal("cancelAnimationFrame", cancel);

		const { container } = render(<Headed />);
		await Promise.resolve();
		const root = container.firstElementChild as HTMLElement;
		expect(root.style.getPropertyValue("--tb-progress")).toBe("0px");

		act(() => setReduced(true));
		expect(root.style.getPropertyValue("--tb-progress")).toBe("280px");
		expect(cancel).toHaveBeenCalledWith(7);
		expect(root.getAttribute("data-motion")).toBe("reduced");
	});

	it("converts viewport measurements to local px under a scaled ancestor", async () => {
		// Same layout seen through `transform: scale(0.8)`: the content's layout
		// height is 1250px, so every viewport delta is 1.25 local px.
		layoutHeaded();
		vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (
			this: HTMLElement
		) {
			return this.classList.contains("tb-content") ? 1250 : 0;
		});
		controllableReducedMotion(true);

		const { container } = render(<Headed />);
		await Promise.resolve();
		const root = container.firstElementChild as HTMLElement;
		expect(root.style.getPropertyValue("--tb-progress")).toBe("350px");
		expect(root.style.getPropertyValue("--tb-height")).toBe("1250px");
		const markers = container.querySelectorAll<HTMLElement>("[data-tracing-beam-marker]");
		expect(markers[0]?.style.top).toBe("187.5px");
		expect(markers[1]?.style.top).toBe("875px");
		expect(markers[0]?.getAttribute("data-lit")).toBe("true");
		expect(markers[1]?.getAttribute("data-lit")).toBe("false");
	});
});
