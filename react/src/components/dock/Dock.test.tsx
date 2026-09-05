import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { Dock } from "./Dock.js";
import { DockIcon } from "./DockIcon.js";

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const COARSE_QUERY = "(any-hover: none)";

/**
 * `PointerEvent`, which the jsdom this package runs on does not implement.
 *
 * Without it `fireEvent.pointerMove` falls back to a plain `Event` and drops
 * the entire init object on the floor — `pointerType`, `isPrimary` and the
 * coordinates all arrive as `undefined`, and every assertion below would then
 * pass for the wrong reason (an undefined `isPrimary` alone makes the dock
 * ignore the move). Extending `MouseEvent` is what makes the coordinates real:
 * jsdom derives `pageX`/`pageY` from `clientX`/`clientY` there. Test-only and
 * file-local, installed only where the host lacks the constructor — a newer
 * jsdom, and a browser, keep their own.
 */
class PointerEventPolyfill extends MouseEvent {
	readonly pointerId: number;
	readonly pointerType: string;
	readonly isPrimary: boolean;

	constructor(type: string, init: PointerEventInit = {}) {
		super(type, init);
		this.pointerId = init.pointerId ?? 0;
		this.pointerType = init.pointerType ?? "";
		this.isPrimary = init.isPrimary ?? false;
	}
}

if (typeof window.PointerEvent === "undefined") {
	Object.defineProperty(window, "PointerEvent", {
		writable: true,
		configurable: true,
		value: PointerEventPolyfill,
	});
}

/**
 * Test-only rig, the counterpart of the Svelte suite's `*.test.svelte`
 * harness. The magnification guard lives across Dock and DockIcon together —
 * Dock owns the two media queries and publishes the resulting `magnify` flag
 * on its context, DockIcon reads it before measuring anything — so proving it
 * needs real instances of both, wired the way a consumer would.
 */
interface HarnessProps {
	magnification?: number;
	distance?: number;
	orientation?: "horizontal" | "vertical";
}

function Harness({
	magnification = 60,
	distance = 140,
	orientation = "horizontal",
}: HarnessProps = {}) {
	return (
		<Dock magnification={magnification} distance={distance} orientation={orientation}>
			<DockIcon className="first-icon">
				<span>1</span>
			</DockIcon>
			<DockIcon className="second-icon">
				<span>2</span>
			</DockIcon>
		</Dock>
	);
}

/**
 * A `matchMedia` stub that answers per query rather than for every query at
 * once. Dock asks two independent questions — "did this visitor ask for less
 * motion?" and "is there a real pointer here?" — and a stub that returned
 * `true` for anything would make a test for one branch silently exercise the
 * other as well. It also records which queries had a listener attached and
 * detached, which is how the unmount test proves both are cleaned up.
 */
function stubMatchMedia(matchingQueries: string[]) {
	const added: string[] = [];
	const removed: string[] = [];

	Object.defineProperty(window, "matchMedia", {
		writable: true,
		configurable: true,
		value: (query: string) => ({
			matches: matchingQueries.includes(query),
			media: query,
			onchange: null,
			addEventListener: () => added.push(query),
			removeEventListener: () => removed.push(query),
			dispatchEvent: () => false,
			addListener: () => {},
			removeListener: () => {},
		}),
	});

	return { added, removed };
}

function icons(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>(".first-icon, .second-icon"));
}

/** Moves the pointer across the dock and lets the one queued frame run.
 * `Dock` defers every position write to `requestAnimationFrame`, so without
 * advancing a frame nothing would have been written yet and every assertion
 * below would pass for the wrong reason. `pointerType` defaults to the mouse
 * because that is the input the magnification exists for; the touch case
 * passes it explicitly. */
function movePointerTo(
	container: HTMLElement,
	x: number,
	init: { pointerType?: string; isPrimary?: boolean } = {}
) {
	const dock = container.querySelector('[role="toolbar"]') as HTMLElement;
	fireEvent.pointerMove(dock, {
		clientX: x,
		clientY: x,
		pageX: x,
		pageY: x,
		pointerType: "mouse",
		isPrimary: true,
		...init,
	});
	// The frame writes state, so it runs inside `act` — the React counterpart
	// of the Svelte suite's `await tick()`.
	act(() => {
		vi.advanceTimersToNextFrame();
	});
}

/**
 * The same move, but with the page and viewport coordinates deliberately pulled
 * apart — a page scrolled 1000px right reports `pageX = clientX + 1000`. jsdom's
 * `MouseEvent` derives `pageX` from `clientX` itself (its `scrollX` is pinned at
 * 0), so the two are written onto the instance directly; they shadow the
 * prototype getters, and React's synthetic event reads them straight off the
 * native event.
 */
function movePointerScrolled(
	container: HTMLElement,
	{ clientX, pageX }: { clientX: number; pageX: number }
) {
	const dock = container.querySelector('[role="toolbar"]') as HTMLElement;
	const event = new window.PointerEvent("pointermove", {
		bubbles: true,
		clientX,
		clientY: clientX,
		pointerType: "mouse",
		isPrimary: true,
	});
	Object.defineProperty(event, "pageX", { get: () => pageX });
	Object.defineProperty(event, "pageY", { get: () => pageX });
	fireEvent(dock, event);
	act(() => {
		vi.advanceTimersToNextFrame();
	});
}

describe("Dock", () => {
	afterEach(cleanup);

	it("renders a toolbar element", () => {
		const { container } = render(<Dock />);
		const toolbar = container.querySelector('[role="toolbar"]');
		expect(toolbar).toBeInTheDocument();
	});

	it("has backdrop-blur-md class", () => {
		const { container } = render(<Dock />);
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("backdrop-blur-md");
	});

	it("has rounded-2xl class", () => {
		const { container } = render(<Dock />);
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("rounded-2xl");
	});

	it("applies custom class names", () => {
		const { container } = render(<Dock className="my-dock" />);
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("my-dock");
	});

	it("uses vertical layout when orientation is vertical", () => {
		const { container } = render(<Dock orientation="vertical" />);
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("flex-col");
	});

	// The class alone is not what assistive technology reads: `role="toolbar"`
	// defaults to a horizontal orientation, so a vertical dock that only swaps
	// its flex direction is still announced as a row of icons.
	it("announces a vertical orientation when orientation is vertical", () => {
		const { container } = render(<Dock orientation="vertical" />);
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar.getAttribute("aria-orientation")).toBe("vertical");
	});

	it("announces a horizontal orientation by default", () => {
		const { container } = render(<Dock />);
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar.getAttribute("aria-orientation")).toBe("horizontal");
	});

	// The dock spreads no rest props, so `ariaLabel` is the only way to name it.
	it("names the toolbar from ariaLabel", () => {
		const { container } = render(<Dock ariaLabel="Application dock" />);
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar.getAttribute("aria-label")).toBe("Application dock");
	});

	it("leaves the toolbar unnamed when no ariaLabel is given", () => {
		const { container } = render(<Dock />);
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar.hasAttribute("aria-label")).toBe(false);
	});

	it("applies items-end class for bottom direction", () => {
		const { container } = render(<Dock direction="bottom" />);
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("items-end");
	});

	it("applies items-start class for top direction", () => {
		const { container } = render(<Dock direction="top" />);
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("items-start");
	});

	it("applies items-center class for middle direction (default)", () => {
		const { container } = render(<Dock />);
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("items-center");
	});

	it("has flex class for layout", () => {
		const { container } = render(<Dock />);
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("flex");
	});

	// The magnification is a JS-written inline `width`/`height`, so no CSS media
	// query can stop it — the driver is what has to be gated, and these tests
	// are the only place that fact is pinned.
	describe("magnification guards", () => {
		let realMatchMedia: typeof window.matchMedia;

		beforeEach(() => {
			realMatchMedia = window.matchMedia;
			vi.useFakeTimers({ toFake: ["requestAnimationFrame"] });
		});

		afterEach(() => {
			vi.useRealTimers();
			Object.defineProperty(window, "matchMedia", {
				writable: true,
				configurable: true,
				value: realMatchMedia,
			});
		});

		// The control. Without this the two guard tests below would pass even if
		// the magnification had been deleted outright.
		it("magnifies the icon nearest the pointer when neither guard applies", () => {
			stubMatchMedia([]);
			const { container } = render(<Harness />);

			movePointerTo(container, 20);

			expect(icons(container)[0]!.style.width).not.toBe("40px");
		});

		// A scrolled page is the whole point: `DockIcon` measures with
		// `getBoundingClientRect()`, which is viewport-relative, so the pointer
		// has to be read in the same frame of reference. Page coordinates carry
		// the scroll offset on top, and every icon's distance would then be
		// wrong by exactly that offset — the dock swelling under a pointer that
		// is somewhere else entirely. jsdom reports a zero rect for every
		// element, so an icon sits at viewport x = 0 here and a pointer at
		// clientX = 0 is right on top of it, however far the page has scrolled.
		it("magnifies from the viewport position, not the page position", () => {
			stubMatchMedia([]);
			const { container } = render(<Harness />);

			movePointerScrolled(container, { clientX: 0, pageX: 1000 });

			expect(icons(container)[0]!.style.width).not.toBe("40px");
		});

		it("leaves every icon at its resting size under reduced motion", () => {
			stubMatchMedia([REDUCED_QUERY]);
			const { container } = render(<Harness />);

			movePointerTo(container, 20);

			for (const icon of icons(container)) {
				expect(icon.style.width).toBe("40px");
				expect(icon.style.height).toBe("40px");
			}
		});

		it("leaves every icon at its resting size on a device with no real pointer", () => {
			stubMatchMedia([COARSE_QUERY]);
			const { container } = render(<Harness />);

			movePointerTo(container, 20);

			for (const icon of icons(container)) {
				expect(icon.style.width).toBe("40px");
				expect(icon.style.height).toBe("40px");
			}
		});

		// The hybrid device the `any-hover` switch exists for: a mouse is
		// attached, so the capability query says hovering is possible, but the
		// gesture in hand is a finger. The magnifier has to ignore that one
		// without going dormant for the mouse beside it.
		it("ignores touch pointers on a device that can also hover", () => {
			stubMatchMedia([]);
			const { container } = render(<Harness />);

			movePointerTo(container, 20, { pointerType: "touch" });

			for (const icon of icons(container)) {
				expect(icon.style.width).toBe("40px");
			}

			// Same device, same dock, real mouse: still magnifies.
			movePointerTo(container, 20);

			expect(icons(container)[0]!.style.width).not.toBe("40px");
		});

		// A second finger, or any secondary pointer, must not drive the
		// magnifier — otherwise a two-finger gesture fights itself.
		it("ignores non-primary pointers", () => {
			stubMatchMedia([]);
			const { container } = render(<Harness />);

			movePointerTo(container, 20, { isPrimary: false });

			for (const icon of icons(container)) {
				expect(icon.style.width).toBe("40px");
			}
		});

		it("detaches both media-query listeners on unmount", () => {
			const { added, removed } = stubMatchMedia([]);
			const { unmount } = render(<Harness />);

			expect(added).toEqual(expect.arrayContaining([REDUCED_QUERY, COARSE_QUERY]));
			expect(removed).toEqual([]);

			unmount();

			expect(removed).toEqual(expect.arrayContaining([REDUCED_QUERY, COARSE_QUERY]));
		});
	});
});
