import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tick } from "svelte";
import Harness from "./AnchoredHarness.test.svelte";
import { anchored, originFor, prefersReducedMotion } from "./anchored.js";
import { DURATIONS, JS_EASINGS } from "./tokens.js";
import { PRESETS } from "./presets.js";
import type { Side, Align } from "../anchor-position.js";

/** The floor the entrance grows from, read from the shared geometry table
 * rather than retyped — a change to `PRESETS.scale` must fail here rather
 * than drift silently apart from the transition. */
const ENTER_FLOOR = PRESETS.scale.scale ?? 0.92;
/** Half the delta of the entrance: an exit is the smaller gesture. */
const EXIT_FLOOR = 1 - (1 - ENTER_FLOOR) / 2;

const el = () => document.createElement("div");

/** Replaces `window.matchMedia` wholesale, the pattern `media-query.svelte.ts`
 * documents and the rest of the repo already uses — `prefersReducedMotion()`
 * resolves it fresh on every call, so an override installed mid-test is
 * visible to the very next read. */
function stubMatchMedia(matches: boolean) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	}));
}

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	// Every test that spies on Element.prototype.animate needs a FRESH spy
	// with an empty call history — vi.spyOn on an already-mocked property
	// reuses the existing mock rather than layering a new one, so without
	// this a later test's `expect(animateSpy).not.toHaveBeenCalled()` would
	// see an earlier test's calls too.
	vi.restoreAllMocks();
});

describe("originFor() — the twelve resolved-side × align origins", () => {
	const cases: Array<[Side, Align, string]> = [
		["bottom", "start", "left top"],
		["bottom", "center", "center top"],
		["bottom", "end", "right top"],
		["top", "start", "left bottom"],
		["top", "center", "center bottom"],
		["top", "end", "right bottom"],
		["left", "start", "right top"],
		["left", "center", "right center"],
		["left", "end", "right bottom"],
		["right", "start", "left top"],
		["right", "center", "left center"],
		["right", "end", "left bottom"],
	];

	it.each(cases)("side %s + align %s grows from %s", (side, align, expected) => {
		expect(originFor(side, align)).toBe(expected);
	});

	it.each(["bottom", "top", "left", "right"] as const)(
		"omitting align on %s is the same as align: center",
		(side) => {
			expect(originFor(side)).toBe(originFor(side, "center"));
		}
	);

	it("always returns an <x> <y> pair, x first", () => {
		for (const [side, align] of cases) {
			const [x, y] = originFor(side, align).split(" ");
			expect(["left", "center", "right"]).toContain(x);
			expect(["top", "center", "bottom"]).toContain(y);
		}
	});
});

describe("anchored() — param resolution (pure, no DOM)", () => {
	it("defaults an entrance to fast / no delay / the arrival curve", () => {
		const config = anchored(el(), undefined, { direction: "in" });
		expect(config.duration).toBe(DURATIONS.fast);
		expect(config.delay).toBe(0);
		expect(config.easing).toBe(JS_EASINGS.out);
		expect(typeof config.css).toBe("function");
		expect(config.tick).toBeUndefined();
	});

	it("defaults an exit to fast and the departure curve", () => {
		const config = anchored(el(), undefined, { direction: "out" });
		expect(config.duration).toBe(DURATIONS.fast);
		expect(config.easing).toBe(JS_EASINGS.in);
	});

	it("treats direction 'both' (one bidirectional directive) as entering", () => {
		const config = anchored(el(), undefined, { direction: "both" });
		expect(config.easing).toBe(JS_EASINGS.out);
		expect(config.css?.(0, 1)).toContain(`scale(${ENTER_FLOOR})`);
	});

	it("entering: false overrides direction 'both' — the escape hatch for a single transition: directive", () => {
		const config = anchored(el(), { entering: false, exitDuration: 42 }, { direction: "both" });
		expect(config.easing).toBe(JS_EASINGS.in);
		expect(config.duration).toBe(42);
	});

	it("entering: true wins over direction 'out'", () => {
		const config = anchored(el(), { entering: true }, { direction: "out" });
		expect(config.easing).toBe(JS_EASINGS.out);
	});

	it("explicit duration / exitDuration / delay override their defaults", () => {
		const entrance = anchored(el(), { duration: 999, delay: 50 }, { direction: "in" });
		expect(entrance.duration).toBe(999);
		expect(entrance.delay).toBe(50);

		const exit = anchored(el(), { exitDuration: 90 }, { direction: "out" });
		expect(exit.duration).toBe(90);
	});

	it("never delays an exit, even when delay is passed — a dismissal that waits reads as unresponsive", () => {
		const config = anchored(el(), { delay: 50 }, { direction: "out" });
		expect(config.delay).toBe(0);
	});
});

describe("anchored() — css(t, u) geometry", () => {
	it("an entrance grows from the shared scale floor up to 1", () => {
		const config = anchored(el(), undefined, { direction: "in" });
		expect(config.css?.(0, 1)).toContain("opacity: 0");
		expect(config.css?.(0, 1)).toContain(`scale(${ENTER_FLOOR})`);
		expect(config.css?.(1, 0)).toContain("opacity: 1");
		expect(config.css?.(1, 0)).toContain("scale(1)");
	});

	it("an exit collapses only half the delta (0.96, not 0.92)", () => {
		expect(EXIT_FLOOR).toBe(0.96);
		const config = anchored(el(), undefined, { direction: "out" });
		expect(config.css?.(0, 1)).toContain(`scale(${EXIT_FLOOR})`);
		expect(config.css?.(1, 0)).toContain("scale(1)");
	});

	it("scale: false is opacity-only — no transform at any t", () => {
		const config = anchored(el(), { scale: false }, { direction: "in" });
		expect(config.css?.(0, 1)).toBe("opacity: 0");
		expect(config.css?.(1, 0)).toBe("opacity: 1");
		expect(config.css?.(0, 1)).not.toContain("transform");
		expect(config.css?.(1, 0)).not.toContain("transform");
	});

	it("never emits transform-origin — that is the caller's static inline style", () => {
		const config = anchored(el(), undefined, { direction: "in" });
		expect(config.css?.(0.5, 0.5)).not.toContain("transform-origin");
	});
});

describe("prefersReducedMotion() and the reduced-motion branch", () => {
	it("is false under the default test-setup matchMedia, so the entrance keeps its full duration", () => {
		expect(prefersReducedMotion()).toBe(false);
		expect(anchored(el()).duration).toBe(DURATIONS.fast);
	});

	it("collapses duration and delay to 0 when the user asked for reduced motion", () => {
		stubMatchMedia(true);
		expect(prefersReducedMotion()).toBe(true);
		const config = anchored(el(), { duration: 999, delay: 50 }, { direction: "in" });
		expect(config.duration).toBe(0);
		expect(config.delay).toBe(0);
	});

	it("returns false, without throwing, where matchMedia does not exist (older or headless hosts)", () => {
		vi.stubGlobal("matchMedia", undefined);
		expect(prefersReducedMotion()).toBe(false);
		expect(anchored(el()).duration).toBe(DURATIONS.fast);
	});

	it("re-reads matchMedia on every call — never memoised at module scope", () => {
		stubMatchMedia(false);
		expect(prefersReducedMotion()).toBe(false);
		stubMatchMedia(true);
		expect(prefersReducedMotion()).toBe(true);
	});
});

describe("anchored transition mounted through {#if} — WAAPI stub path (non-zero duration)", () => {
	it("mounts and unmounts through Element.prototype.animate, driven by the test-setup.ts stub", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const { container, rerender } = render(Harness, {
			props: { open: false, side: "bottom" as Side },
		});
		expect(container.querySelector('[data-testid="node"]')).toBeNull();

		// A genuine (non-first-mount) intro: the node appears after this.
		await rerender({ open: true, side: "bottom" as Side });
		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="node"]')).not.toBeNull();
		});

		// The outro: the node leaves after the WAAPI stub's chained
		// dummy-then-real animation resolves across a couple of microtasks.
		await rerender({ open: false, side: "bottom" as Side });
		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="node"]')).toBeNull();
		});

		// Without src/test-setup.ts's stub this whole test would have thrown
		// synchronously on the first `element.animate()` call instead of
		// getting this far — reaching here already proves the stub worked,
		// and this asserts it was the actual mechanism, not a side effect of
		// something else.
		expect(animateSpy).toHaveBeenCalled();
	});

	it("writes the origin as a static inline style alongside the transition", async () => {
		const { container, rerender } = render(Harness, {
			props: { open: false, side: "right" as Side, align: "start" as Align },
		});
		await rerender({ open: true, side: "right" as Side, align: "start" as Align });

		const node = await vi.waitFor(() => {
			const found = container.querySelector<HTMLElement>('[data-testid="node"]');
			expect(found).not.toBeNull();
			return found!;
		});
		expect(node.style.transformOrigin).toBe("left top");
	});
});

describe("anchored transition — reduced motion (duration 0, Svelte's own synchronous fast path)", () => {
	it("never calls Element.prototype.animate when the user asked for reduced motion", async () => {
		stubMatchMedia(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const { container, rerender } = render(Harness, { props: { open: false } });

		await rerender({ open: true });
		await tick();
		expect(container.querySelector('[data-testid="node"]')).not.toBeNull();

		await rerender({ open: false });
		await tick();
		expect(container.querySelector('[data-testid="node"]')).toBeNull();

		expect(animateSpy).not.toHaveBeenCalled();
	});
});
