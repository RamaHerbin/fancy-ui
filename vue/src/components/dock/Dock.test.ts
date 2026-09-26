import { render, cleanup, fireEvent } from "@testing-library/vue";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { defineComponent, h, nextTick, type PropType } from "vue";
import Dock from "./Dock.vue";
import DockIcon from "./DockIcon.vue";
import DockSeparator from "./DockSeparator.vue";

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
 * needs real instances of both, wired the way a consumer would. Raw HTML from
 * a `.ts` test file carries no provided context, so a DockIcon built that way
 * could never see the flag at all.
 */
const Harness = defineComponent({
	name: "DockHarness",
	props: {
		magnification: { type: Number, default: 60 },
		distance: { type: Number, default: 140 },
		orientation: {
			type: String as PropType<"horizontal" | "vertical">,
			default: "horizontal",
		},
	},
	setup(props) {
		return () =>
			h(
				Dock,
				{
					magnification: props.magnification,
					distance: props.distance,
					orientation: props.orientation,
				},
				{
					default: () => [
						h(DockIcon, { class: "first-icon" }, { default: () => h("span", "1") }),
						h(DockIcon, { class: "second-icon" }, { default: () => h("span", "2") }),
					],
				}
			);
	},
});

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

function icons(container: Element): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>(".first-icon, .second-icon"));
}

/** Moves the pointer across the dock and lets the one queued frame run.
 * `Dock` defers every position write to `requestAnimationFrame`, so without
 * advancing a frame nothing would have been written yet and every assertion
 * below would pass for the wrong reason. `pointerType` defaults to the mouse
 * because that is the input the magnification exists for; the touch case
 * passes it explicitly. */
async function movePointerTo(
	container: Element,
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
	await nextTick();
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

	// The Svelte source and the React port both throw when a subcomponent is
	// mounted outside a dock; this package degrades instead, because the
	// package-wide SSR sweeps render every export on its own. These two pin
	// that divergence.
	describe("outside a Dock", () => {
		it("renders a lone icon at its resting size", () => {
			const { container } = render(DockIcon, { props: { class: "lone-icon" } });
			const icon = container.querySelector(".lone-icon") as HTMLElement;
			expect(icon.style.width).toBe("40px");
			expect(icon.style.height).toBe("40px");
		});

		it("renders a lone separator on the horizontal axis", () => {
			const { container } = render(DockSeparator, { props: { class: "lone-rule" } });
			const rule = container.querySelector(".lone-rule") as HTMLElement;
			expect(rule.className).toContain("h-4/5");
			expect(rule.className).toContain("w-0.5");
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

			expect(icons(container)[0]!.style.width).not.toBe("40px");
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

			expect(icons(container)[0]!.style.width).not.toBe("40px");
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
