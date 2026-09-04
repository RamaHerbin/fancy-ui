import { render, cleanup, act } from "@testing-library/react";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { Timeline, type TimelineItem } from "./Timeline.js";

const mockItems = [
	{ id: "one", label: "2020" },
	{ id: "two", label: "2021" },
	{ id: "three", label: "2022" },
];

/** The 2px background rail; the progress line is its only child. */
const RAIL = '[class*="mask-image"]';

function progressLineOf(root: ParentNode): HTMLElement {
	const line = root.querySelector<HTMLElement>(`${RAIL} > div`);
	if (!line) throw new Error("progress line not found");
	return line;
}

/** Waits one animation frame, so a rAF-throttled scroll handler has run. */
function nextFrame(): Promise<void> {
	return new Promise<void>((resolve) => {
		if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resolve());
		else resolve();
	});
}

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
		expect(h2?.textContent).toBe("My Timeline");
	});

	it("renders description when provided", () => {
		const { container } = render(<Timeline title="Title" description="My description" />);
		const p = container.querySelector("p");
		expect(p?.textContent).toBe("My description");
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
		expect(labels[0]?.textContent).toBe("2020");
		expect(labels[1]?.textContent).toBe("2021");
	});

	it("applies custom class names", () => {
		const { container } = render(<Timeline className="my-timeline" />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("my-timeline");
	});

	describe("scroll progress", () => {
		// jsdom measures everything as 0x0, so the geometry the progress
		// fraction is derived from has to be supplied.
		let rect = { top: 0, bottom: 0, height: 0 };

		beforeEach(() => {
			rect = { top: 0, bottom: 0, height: 0 };
			vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
				() =>
					({
						top: rect.top,
						bottom: rect.bottom,
						height: rect.height,
						left: 0,
						right: 0,
						width: 0,
						x: 0,
						y: rect.top,
						toJSON: () => ({}),
					}) as DOMRect
			);
		});

		it("does not re-invoke the content render prop on scroll", async () => {
			const content = vi.fn((item: TimelineItem): ReactNode => <span>{item.label}</span>);
			rect = { top: 200, bottom: 800, height: 600 };
			render(<Timeline items={mockItems} content={content} />);

			const callsAfterMount = content.mock.calls.length;
			expect(callsAfterMount).toBeGreaterThan(0);

			rect = { top: -100, bottom: 500, height: 600 };
			await act(async () => {
				window.dispatchEvent(new Event("scroll"));
				await nextFrame();
			});

			expect(content).toHaveBeenCalledTimes(callsAfterMount);
		});

		it("moves the progress line on scroll", async () => {
			// Timeline below the tracking window: progress pinned at 0.
			rect = { top: 900, bottom: 1500, height: 600 };
			const { container } = render(<Timeline items={mockItems} />);
			const line = progressLineOf(container);
			expect(line.style.height).toBe("0px");

			// Scrolled into the tracking window.
			rect = { top: -100, bottom: 500, height: 600 };
			await act(async () => {
				window.dispatchEvent(new Event("scroll"));
				await nextFrame();
			});

			expect(Number.parseFloat(line.style.height)).toBeGreaterThan(0);
			expect(line.style.opacity).toBe("1");
		});

		it("writes the measured geometry before the browser paints", () => {
			rect = { top: -100, bottom: 500, height: 600 };
			// A parent layout effect runs in the same commit as the child's,
			// after it and before any passive effect — so what it reads here is
			// what the first painted frame shows.
			let heightAtPaint: string | undefined;

			function Probe() {
				const ref = useRef<HTMLDivElement | null>(null);
				useLayoutEffect(() => {
					heightAtPaint = progressLineOf(ref.current as ParentNode).style.height;
				}, []);
				return (
					<div ref={ref}>
						<Timeline items={mockItems} />
					</div>
				);
			}

			render(<Probe />);

			expect(heightAtPaint).toBeDefined();
			expect(Number.parseFloat(heightAtPaint as string)).toBeGreaterThan(0);
		});
	});
});
