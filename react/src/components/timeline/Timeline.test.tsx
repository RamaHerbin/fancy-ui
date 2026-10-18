import { render, cleanup, act } from "@testing-library/react";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { Timeline, type TimelineItem } from "./Timeline.js";

const mockItems = [
	{ id: "one", label: "2020" },
	{ id: "two", label: "2021" },
	{ id: "three", label: "2022" },
];

describe("Timeline", () => {
	beforeEach(() => {
		// Mock ResizeObserver (not available in jsdom) - must be a class
		global.ResizeObserver = class {
			observe = vi.fn();
			unobserve = vi.fn();
			disconnect = vi.fn();
		};
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("renders a container div", () => {
		const { container } = render(<Timeline />);
		const div = container.firstElementChild as HTMLElement;
		expect(div).toBeInTheDocument();
	});

	it("has w-full class", () => {
		const { container } = render(<Timeline />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("w-full");
	});

	it("renders title when provided", () => {
		const { container } = render(<Timeline title="My Timeline" />);
		const h2 = container.querySelector("h2");
		expect(h2).toBeInTheDocument();
		expect(h2?.textContent?.trim()).toBe("My Timeline");
	});

	it("renders description when provided", () => {
		const { container } = render(<Timeline title="Title" description="My description" />);
		const p = container.querySelector("p");
		expect(p?.textContent?.trim()).toBe("My description");
	});

	it("does not render header section when no title or description", () => {
		const { container } = render(<Timeline />);
		const h2 = container.querySelector("h2");
		expect(h2).not.toBeInTheDocument();
	});

	it("renders one entry per item", () => {
		const { container } = render(<Timeline items={mockItems} />);
		const labels = container.querySelectorAll("h3");
		expect(labels.length).toBe(3);
	});

	it("displays item labels", () => {
		const { container } = render(<Timeline items={mockItems} />);
		const labels = container.querySelectorAll("h3");
		expect(labels[0]?.textContent?.trim()).toBe("2020");
		expect(labels[1]?.textContent?.trim()).toBe("2021");
	});

	it("applies custom class names", () => {
		const { container } = render(<Timeline className="my-timeline" />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("my-timeline");
	});
});

describe("Timeline light rail", () => {
	const originalMatchMedia = window.matchMedia;

	// A hand-cranked frame queue: rAF-throttled work runs when the test says so.
	let frames: FrameRequestCallback[] = [];
	function runFrames() {
		const pending = frames;
		frames = [];
		for (const cb of pending) cb(0);
	}

	beforeEach(() => {
		global.ResizeObserver = class {
			observe = vi.fn();
			unobserve = vi.fn();
			disconnect = vi.fn();
		};
		frames = [];
		vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
			frames.push(cb);
			return frames.length;
		});
		vi.stubGlobal("cancelAnimationFrame", () => {});
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		window.matchMedia = originalMatchMedia;
	});

	/** Gives each row a resting offset and the track a height, as a browser layout would. */
	function layout(container: HTMLElement, rowTops: number[], trackHeight: number) {
		const rows = container.querySelectorAll<HTMLElement>("[data-timeline-row]");
		rows.forEach((row, i) => {
			Object.defineProperty(row, "offsetTop", { configurable: true, value: rowTops[i] });
		});
		const track = container.querySelector<HTMLElement>("[data-timeline-track]")!;
		Object.defineProperty(track, "offsetHeight", { configurable: true, value: trackHeight });
		return track;
	}

	/** Places the track `top` px from the viewport top, then lets the component re-measure. */
	function scrollTo(track: HTMLElement, top: number) {
		track.getBoundingClientRect = () =>
			({
				top,
				bottom: top + 1400,
				left: 0,
				right: 0,
				width: 0,
				height: 1400,
				x: 0,
				y: top,
				toJSON: () => ({}),
			}) as DOMRect;
		act(() => {
			window.dispatchEvent(new Event("resize"));
			runFrames();
		});
	}

	function litStates(container: HTMLElement) {
		return Array.from(container.querySelectorAll("[data-timeline-dot]")).map((d) =>
			d.getAttribute("data-lit")
		);
	}

	it("lights a dot once the head has passed it", () => {
		const { container } = render(<Timeline items={mockItems} />);
		const track = layout(container, [0, 400, 800], 1400);

		// Track still below the reading line: the head rests on the first dot.
		scrollTo(track, 600);
		expect(litStates(container)).toEqual(["true", "false", "false"]);

		// Reading line (160px sticky offset + 20px dot centre) is now 480px into the track.
		scrollTo(track, -300);
		expect(litStates(container)).toEqual(["true", "true", "false"]);
		const root = container.firstElementChild as HTMLElement;
		expect(root.style.getPropertyValue("--tl-progress")).toBe("480px");

		const rows = container.querySelectorAll("[data-timeline-row]");
		expect(rows[0]?.getAttribute("data-state")).toBe("past");
		expect(rows[1]?.getAttribute("data-state")).toBe("active");
		expect(rows[2]?.getAttribute("data-state")).toBe("upcoming");
	});

	it("passes accent through to the --timeline-accent custom property", () => {
		const { container } = render(<Timeline items={mockItems} accent="#ff3366" />);
		const root = container.firstElementChild as HTMLElement;
		expect(root.style.getPropertyValue("--timeline-accent")).toBe("#ff3366");
	});

	it("renders the glowing head when motion is allowed", () => {
		const { container } = render(<Timeline items={mockItems} />);
		expect(container.querySelector("[data-timeline-head]")).toBeInTheDocument();
		expect(container.firstElementChild?.getAttribute("data-motion")).toBe("full");
	});

	it("drops the glowing head under reduced motion but still lights dots by position", () => {
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

		const { container } = render(<Timeline items={mockItems} />);
		expect(container.querySelector("[data-timeline-head]")).not.toBeInTheDocument();
		expect(container.firstElementChild?.getAttribute("data-motion")).toBe("reduced");

		const track = layout(container, [0, 400, 800], 1400);
		scrollTo(track, -300);
		expect(litStates(container)).toEqual(["true", "true", "false"]);
	});

	it("follows window scroll between re-measures", () => {
		const { container } = render(<Timeline items={mockItems} />);
		const track = layout(container, [0, 400, 800], 1400);
		scrollTo(track, 600);
		expect(litStates(container)).toEqual(["true", "false", "false"]);

		// A plain scroll (no resize): only the head is re-placed.
		track.getBoundingClientRect = () => ({ top: -700, bottom: 700 }) as DOMRect;
		act(() => {
			window.dispatchEvent(new Event("scroll"));
			runFrames();
		});
		expect(litStates(container)).toEqual(["true", "true", "true"]);
		const root = container.firstElementChild as HTMLElement;
		expect(root.style.getPropertyValue("--tl-progress")).toBe("880px");
	});

	it("removes its window listeners on unmount", () => {
		const remove = vi.spyOn(window, "removeEventListener");
		const { unmount } = render(<Timeline items={mockItems} />);
		unmount();
		const types = remove.mock.calls.map((c) => c[0]);
		expect(types).toContain("scroll");
		expect(types).toContain("resize");
	});

	it("keeps every decorative layer hidden from assistive tech", () => {
		const { container } = render(<Timeline items={mockItems} />);
		const decorative = container.querySelectorAll(
			".tl-rail, [data-timeline-head], [data-timeline-dot-box], .tl-index"
		);
		expect(decorative.length).toBeGreaterThan(0);
		for (const el of decorative) {
			expect(el.getAttribute("aria-hidden")).toBe("true");
		}
	});

	it("does not re-invoke the content render prop on scroll", () => {
		const content = vi.fn((item: TimelineItem): ReactNode => <span>{item.label}</span>);
		const { container } = render(<Timeline items={mockItems} content={content} />);
		const track = layout(container, [0, 400, 800], 1400);
		scrollTo(track, 600);

		const callsAfterMount = content.mock.calls.length;
		expect(callsAfterMount).toBeGreaterThan(0);

		// Crosses a dot, so the rows re-render to flip data-state / data-lit.
		scrollTo(track, -300);
		expect(litStates(container)).toEqual(["true", "true", "false"]);
		expect(content).toHaveBeenCalledTimes(callsAfterMount);
	});

	it("writes the head position before the browser paints", () => {
		// A parent layout effect runs in the same commit as the child's,
		// after it and before any passive effect — so what it reads here is
		// what the first painted frame shows.
		let progressAtPaint: string | undefined;

		function Probe() {
			const ref = useRef<HTMLDivElement | null>(null);
			useLayoutEffect(() => {
				const root = ref.current?.firstElementChild as HTMLElement;
				progressAtPaint = root.style.getPropertyValue("--tl-progress");
			}, []);
			return (
				<div ref={ref}>
					<Timeline items={mockItems} />
				</div>
			);
		}

		render(<Probe />);

		// jsdom lays nothing out, so the head parks on the first dot (20px).
		expect(progressAtPaint).toBe("20px");
	});
});
