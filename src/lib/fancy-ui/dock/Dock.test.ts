import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { tick } from "svelte";
import Dock from "./Dock.svelte";
import Harness from "./DockHarness.test.svelte";

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

/** Moves the pointer across the dock and lets the one queued frame run.
 * `Dock` defers every position write to `requestAnimationFrame`, so without
 * advancing a frame nothing would have been written yet and every assertion
 * below would pass for the wrong reason. `pointerType` defaults to the mouse
 * because that is the input the magnification exists for; the touch case
 * passes it explicitly. */
async function movePointerTo(
	container: HTMLElement,
	x: number,
	init: { pointerType?: string; isPrimary?: boolean } = {}
) {
	const dock = container.querySelector('[role="toolbar"]') as HTMLElement;
	await fireEvent.pointerMove(dock, {
		clientX: x,
		clientY: x,
		pageX: x,
		pageY: x,
		pointerType: "mouse",
		isPrimary: true,
		...init,
	});
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

		it("detaches both media-query listeners on unmount", () => {
			const { added, removed } = stubMatchMedia([]);
			const { unmount } = render(Harness);

			expect(added).toEqual(expect.arrayContaining([REDUCED_QUERY, COARSE_QUERY]));
			expect(removed).toEqual([]);

			unmount();

			expect(removed).toEqual(expect.arrayContaining([REDUCED_QUERY, COARSE_QUERY]));
		});
	});
});
