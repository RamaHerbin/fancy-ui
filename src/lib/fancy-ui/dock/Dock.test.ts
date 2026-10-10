import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { tick } from "svelte";
import Dock from "./Dock.svelte";
import Harness from "./DockHarness.test.svelte";
import { dockIconSize, DOCK_BASE_SIZE } from "./DockIcon.svelte";

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const COARSE_QUERY = "(any-hover: none)";

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

function toolbar(container: HTMLElement): HTMLElement {
	return container.querySelector('[role="toolbar"]') as HTMLElement;
}

/**
 * jsdom lays nothing out, so every `getBoundingClientRect()` is all zeros.
 * This gives the two harness icons and the shelf a real, VIEWPORT-relative
 * geometry: first icon 0–40, second 56–96 on both axes (40px icons, a 16px
 * gap), the shelf starting at `shelfLeft`/`shelfTop`.
 */
function stubGeometry({ shelfLeft = 0, shelfTop = 0 } = {}) {
	const rect = (x: number, y: number, w: number, h: number) =>
		({
			x,
			y,
			left: x,
			top: y,
			width: w,
			height: h,
			right: x + w,
			bottom: y + h,
			toJSON: () => ({}),
		}) as DOMRect;

	return vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
		this: Element
	) {
		if (this.classList.contains("first-icon")) return rect(0, 0, 40, 40);
		if (this.classList.contains("second-icon")) return rect(56, 56, 40, 40);
		if (this.getAttribute("role") === "toolbar") return rect(shelfLeft, shelfTop, 120, 58);
		return rect(0, 0, 0, 0);
	});
}

/** Moves the pointer across the dock and lets the one queued frame run.
 * `Dock` defers every position write to `requestAnimationFrame`, so without
 * advancing a frame nothing would have been written yet and every assertion
 * below would pass for the wrong reason. `pointerType` defaults to the mouse
 * because that is the input the magnification exists for; the touch case
 * passes it explicitly. `scroll` adds a page offset to `pageX`/`pageY` only,
 * the way a scrolled document does — `Dock` must ignore it. */
async function movePointerTo(
	container: HTMLElement,
	x: number,
	init: { pointerType?: string; isPrimary?: boolean; scroll?: number } = {}
) {
	const { scroll = 0, ...rest } = init;
	await fireEvent.pointerMove(toolbar(container), {
		clientX: x,
		clientY: x,
		pageX: x + scroll,
		pageY: x + scroll,
		pointerType: "mouse",
		isPrimary: true,
		...rest,
	});
	vi.advanceTimersToNextFrame();
	await tick();
}

async function leaveDock(container: HTMLElement) {
	await fireEvent.pointerLeave(toolbar(container));
	vi.advanceTimersToNextFrame();
	await tick();
}

describe("Dock", () => {
	afterEach(cleanup);

	it("renders a toolbar element", () => {
		const { container } = render(Dock);
		const toolbar = container.querySelector('[role="toolbar"]');
		expect(toolbar).toBeInTheDocument();
	});

	it("has backdrop-blur-md class", () => {
		const { container } = render(Dock);
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("backdrop-blur-md");
	});

	it("has rounded-2xl class", () => {
		const { container } = render(Dock);
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("rounded-2xl");
	});

	it("applies custom class names", () => {
		const { container } = render(Dock, { props: { class: "my-dock" } });
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("my-dock");
	});

	it("uses vertical layout when orientation is vertical", () => {
		const { container } = render(Dock, { props: { orientation: "vertical" } });
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("flex-col");
	});

	it("applies items-end class for bottom direction", () => {
		const { container } = render(Dock, { props: { direction: "bottom" } });
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("items-end");
	});

	it("applies items-start class for top direction", () => {
		const { container } = render(Dock, { props: { direction: "top" } });
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("items-start");
	});

	it("applies items-center class for middle direction (default)", () => {
		const { container } = render(Dock);
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("items-center");
	});

	it("has flex class for layout", () => {
		const { container } = render(Dock);
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("flex");
	});

	it("names the toolbar from ariaLabel and states its orientation", () => {
		const { container } = render(Dock, {
			props: { ariaLabel: "Applications", orientation: "vertical" },
		});
		const el = toolbar(container);
		expect(el.getAttribute("aria-label")).toBe("Applications");
		expect(el.getAttribute("aria-orientation")).toBe("vertical");
	});

	it("defaults aria-orientation to horizontal and leaves aria-label off", () => {
		const { container } = render(Dock);
		const el = toolbar(container);
		expect(el.getAttribute("aria-orientation")).toBe("horizontal");
		expect(el.hasAttribute("aria-label")).toBe(false);
	});

	it("renders the spotlight layers by default, hidden from assistive tech", () => {
		const { container } = render(Dock);
		const el = toolbar(container);
		expect(el.hasAttribute("data-spotlight")).toBe(true);
		const deco = el.querySelector(".dock-deco") as HTMLElement;
		expect(deco.getAttribute("aria-hidden")).toBe("true");
		expect(deco.querySelector(".dock-spot")).not.toBeNull();
		expect(deco.querySelector(".dock-rim")).not.toBeNull();
		expect(deco.querySelector(".dock-frame")).not.toBeNull();
	});

	it("drops the spotlight when spotlight is false but keeps the inner frame", () => {
		const { container } = render(Dock, { props: { spotlight: false } });
		const el = toolbar(container);
		expect(el.hasAttribute("data-spotlight")).toBe(false);
		expect(el.querySelector(".dock-spot")).toBeNull();
		expect(el.querySelector(".dock-rim")).toBeNull();
		expect(el.querySelector(".dock-frame")).not.toBeNull();
	});

	it("marks every icon for a floor reflection by default", () => {
		const { container } = render(Harness);
		expect(toolbar(container).hasAttribute("data-reflection")).toBe(true);
		for (const icon of icons(container)) {
			expect(icon.hasAttribute("data-reflection")).toBe(true);
		}
	});

	it("drops the reflection when reflection is false", () => {
		const { container } = render(Harness, { props: { reflection: false } });
		expect(toolbar(container).hasAttribute("data-reflection")).toBe(false);
		for (const icon of icons(container)) {
			expect(icon.hasAttribute("data-reflection")).toBe(false);
		}
	});

	it("renders the separator as a separator perpendicular to the dock", () => {
		const { container } = render(Harness, { props: { withSeparator: true } });
		const sep = container.querySelector('[role="separator"]') as HTMLElement;
		expect(sep).not.toBeNull();
		expect(sep.getAttribute("aria-orientation")).toBe("vertical");
	});

	describe("dockIconSize (the cosine bell)", () => {
		it("is the full magnification under the pointer and the base size at the edge", () => {
			expect(dockIconSize(0, 60, 140)).toBe(DOCK_BASE_SIZE + 60);
			expect(dockIconSize(140, 60, 140)).toBeCloseTo(DOCK_BASE_SIZE, 10);
			expect(dockIconSize(-400, 60, 140)).toBe(DOCK_BASE_SIZE);
			expect(dockIconSize(Infinity, 60, 140)).toBe(DOCK_BASE_SIZE);
		});

		it("is symmetric and falls below a straight line past half the distance", () => {
			const d = 105; // 3/4 of the way out
			const linear = DOCK_BASE_SIZE + (1 - d / 140) * 60;
			const bell = dockIconSize(d, 60, 140);
			expect(bell).toBeCloseTo(dockIconSize(-d, 60, 140), 10);
			expect(bell).toBeGreaterThan(DOCK_BASE_SIZE);
			expect(bell).toBeLessThan(linear);
		});

		it("returns the base size when magnification or distance is zero", () => {
			expect(dockIconSize(0, 0, 140)).toBe(DOCK_BASE_SIZE);
			expect(dockIconSize(0, 60, 0)).toBe(DOCK_BASE_SIZE);
		});
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
			vi.restoreAllMocks();
			vi.useRealTimers();
			Object.defineProperty(window, "matchMedia", {
				writable: true,
				configurable: true,
				value: realMatchMedia,
			});
		});

		// The control. Without this the two guard tests below would pass even if
		// the magnification had been deleted outright.
		it("magnifies the icon nearest the pointer when neither guard applies", async () => {
			stubMatchMedia([]);
			const { container } = render(Harness);

			await movePointerTo(container, 20);

			expect(icons(container)[0].style.width).not.toBe("40px");
		});

		it("leaves every icon at its resting size under reduced motion", async () => {
			stubMatchMedia([REDUCED_QUERY]);
			const { container } = render(Harness);

			await movePointerTo(container, 20);

			for (const icon of icons(container)) {
				expect(icon.style.width).toBe("40px");
				expect(icon.style.height).toBe("40px");
			}
		});

		it("leaves every icon at its resting size on a device with no real pointer", async () => {
			stubMatchMedia([COARSE_QUERY]);
			const { container } = render(Harness);

			await movePointerTo(container, 20);

			for (const icon of icons(container)) {
				expect(icon.style.width).toBe("40px");
				expect(icon.style.height).toBe("40px");
			}
		});

		// The hybrid device the `any-hover` switch exists for: a mouse is
		// attached, so the capability query says hovering is possible, but the
		// gesture in hand is a finger. The magnifier has to ignore that one
		// without going dormant for the mouse beside it.
		it("ignores touch pointers on a device that can also hover", async () => {
			stubMatchMedia([]);
			const { container } = render(Harness);

			await movePointerTo(container, 20, { pointerType: "touch" });

			for (const icon of icons(container)) {
				expect(icon.style.width).toBe("40px");
			}

			// Same device, same dock, real mouse: still magnifies.
			await movePointerTo(container, 20);

			expect(icons(container)[0].style.width).not.toBe("40px");
		});

		// A second finger, or any secondary pointer, must not drive the
		// magnifier — otherwise a two-finger gesture fights itself.
		it("ignores non-primary pointers", async () => {
			stubMatchMedia([]);
			const { container } = render(Harness);

			await movePointerTo(container, 20, { isPrimary: false });

			for (const icon of icons(container)) {
				expect(icon.style.width).toBe("40px");
			}
		});

		it("sizes a mid-distance neighbour on the cosine bell, below a linear falloff", async () => {
			stubMatchMedia([]);
			stubGeometry();
			const { container } = render(Harness);

			// Second icon's centre is at 76; 105px to its right is 3/4 of `distance`.
			await movePointerTo(container, 76 + 105);

			const second = icons(container)[1];
			const size = parseFloat(second.style.width);
			const linear = 40 + (1 - 105 / 140) * 60;
			expect(size).toBeGreaterThan(40);
			expect(size).toBeLessThan(linear);
			expect(size).toBeCloseTo(40 + 60 * 0.5 * (1 + Math.cos(Math.PI * 0.75)), 5);
		});

		it("measures in viewport coordinates, so a scrolled page does not shift the magnifier", async () => {
			stubMatchMedia([]);
			stubGeometry();
			const { container } = render(Harness);

			// The pointer is dead centre on the first icon in the viewport, but the
			// page is scrolled 800px. Page coordinates would put it far away.
			await movePointerTo(container, 20, { scroll: 800 });

			expect(icons(container)[0].style.width).toBe("100px");
		});

		it("measures along the vertical axis on a vertical dock", async () => {
			stubMatchMedia([]);
			stubGeometry();
			const { container } = render(Harness, { props: { orientation: "vertical" } });

			await fireEvent.pointerMove(toolbar(container), {
				clientX: 9999,
				clientY: 76,
				pointerType: "mouse",
				isPrimary: true,
			});
			vi.advanceTimersToNextFrame();
			await tick();

			const [first, second] = icons(container);
			expect(second.style.height).toBe("100px");
			expect(second.hasAttribute("data-dock-active")).toBe(true);
			expect(first.hasAttribute("data-dock-active")).toBe(false);
		});

		it("marks only the icon under the pointer as active, and clears it on leave", async () => {
			stubMatchMedia([]);
			stubGeometry();
			const { container } = render(Harness);
			const [first, second] = icons(container);

			await movePointerTo(container, 20);
			expect(first.hasAttribute("data-dock-active")).toBe(true);
			expect(second.hasAttribute("data-dock-active")).toBe(false);

			await movePointerTo(container, 76);
			expect(first.hasAttribute("data-dock-active")).toBe(false);
			expect(second.hasAttribute("data-dock-active")).toBe(true);

			// In the gap between the two: nobody.
			await movePointerTo(container, 48);
			expect(first.hasAttribute("data-dock-active")).toBe(false);
			expect(second.hasAttribute("data-dock-active")).toBe(false);

			await movePointerTo(container, 20);
			await leaveDock(container);
			expect(first.hasAttribute("data-dock-active")).toBe(false);
			expect(first.style.width).toBe("40px");
		});

		it("keeps the indicator working under reduced motion while the size stays put", async () => {
			stubMatchMedia([REDUCED_QUERY]);
			stubGeometry();
			const { container } = render(Harness);

			await movePointerTo(container, 20);

			const [first] = icons(container);
			expect(first.hasAttribute("data-dock-active")).toBe(true);
			expect(first.style.width).toBe("40px");
		});

		it("writes the spotlight position shelf-local and flags hover while inside", async () => {
			stubMatchMedia([]);
			stubGeometry({ shelfLeft: 100, shelfTop: 10 });
			const { container } = render(Harness);
			const el = toolbar(container);

			expect(el.hasAttribute("data-hover")).toBe(false);

			await movePointerTo(container, 130);
			expect(el.hasAttribute("data-hover")).toBe(true);
			expect(el.style.getPropertyValue("--dock-x")).toBe("30px");
			expect(el.style.getPropertyValue("--dock-y")).toBe("120px");

			await leaveDock(container);
			expect(el.hasAttribute("data-hover")).toBe(false);
		});

		it("tracks nothing on a device with no real pointer", async () => {
			stubMatchMedia([COARSE_QUERY]);
			stubGeometry();
			const { container } = render(Harness);

			await movePointerTo(container, 20);

			expect(toolbar(container).hasAttribute("data-hover")).toBe(false);
			for (const icon of icons(container)) {
				expect(icon.hasAttribute("data-dock-active")).toBe(false);
			}
		});

		it("detaches both media-query listeners on unmount", () => {
			const { added, removed } = stubMatchMedia([]);
			const { unmount } = render(Harness);

			expect(added).toEqual(expect.arrayContaining([REDUCED_QUERY, COARSE_QUERY]));
			expect(removed).toEqual([]);

			unmount();

			expect(removed).toEqual(expect.arrayContaining([REDUCED_QUERY, COARSE_QUERY]));
		});

		// The frame queue is the one piece of state that outlives a pointer
		// event: a move right before unmount must not leave a frame behind to
		// write into a torn-down dock.
		it("cancels a still-queued pointer frame on unmount", async () => {
			vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
			stubMatchMedia([]);
			const { container, unmount } = render(Harness);

			await fireEvent.pointerMove(toolbar(container), {
				clientX: 20,
				clientY: 20,
				pointerType: "mouse",
				isPrimary: true,
			});
			expect(vi.getTimerCount()).toBe(1);

			unmount();

			expect(vi.getTimerCount()).toBe(0);
		});
	});
});
