import { render, cleanup, waitFor } from "@testing-library/vue";
import { config, mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { REDUCED_MOTION_QUERY } from "../../internals/motion/media-query.js";
import { DURATIONS, STAGGER_CAPS } from "../../internals/motion/tokens.js";
import TextRoll from "./TextRoll.vue";
import { rollIn, rollOut } from "./roll-transitions.js";

// The mounting helper stubs `<Transition>`/`<TransitionGroup>` out of the
// tree by default, which would remove every cell in the same patch instead
// of running the roll these tests exist to pin. Opted out for this file
// only; Vitest isolates the module registry per test file.
config.global.stubs = { ...config.global.stubs, transition: false, "transition-group": false };

/** Same shape the rest of this family's suites use to force a
 * `prefers-reduced-motion` branch — a full `MediaQueryList`-shaped stub, not
 * a bare object, and keyed on the actual query string so a component reading
 * some OTHER media feature doesn't also get told "reduced". */
function stubMatchMedia(reducedMotion: boolean) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: query === REDUCED_MOTION_QUERY ? reducedMotion : false,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	}));
}

function root(container: Element): HTMLElement {
	return container.querySelector(".ft-textroll") as HTMLElement;
}

function realLayer(container: Element): HTMLElement {
	return container.querySelector(".ft-textroll-real") as HTMLElement;
}

function cellsLayer(container: Element): HTMLElement {
	return container.querySelector(".ft-textroll-cells") as HTMLElement;
}

function cellEls(container: Element): HTMLElement[] {
	return Array.from(container.querySelectorAll(".ft-textroll-cells .ft-textroll-cell"));
}

/**
 * What an accessibility tree (or a copy operation that respects it) would
 * see: every `aria-hidden="true"` subtree contributes nothing. Plain
 * `Element.textContent` does not model this — it walks every text node
 * regardless of `aria-hidden` — which is exactly the gap this helper closes
 * for the "the value appears exactly once" contract below: the cell layer
 * visually mirrors every grapheme too, so a raw `textContent` check would
 * see the value TWICE unless the aria-hidden layer is excluded first.
 */
function accessibleText(el: Element): string {
	if (el.getAttribute("aria-hidden") === "true") return "";
	let text = "";
	for (const child of Array.from(el.childNodes)) {
		if (child.nodeType === Node.TEXT_NODE) text += child.textContent ?? "";
		else if (child.nodeType === Node.ELEMENT_NODE) text += accessibleText(child as Element);
	}
	return text;
}

/** The shape exposed by `TextRollHarness` below — typed separately and read
 * back through a cast, since `defineComponent`'s object-options overload
 * (unlike a `<script setup>` SFC's `defineExpose`) does not surface an
 * `expose()` call's argument in `wrapper.vm`'s inferred type. */
interface TextRollHarnessInstance {
	setValue: (next: string) => void;
	setDirection: (next: "auto" | "up" | "down") => void;
	setDuration: (next: number) => void;
}

/**
 * Test-only harness: owns `value`/`direction`/`duration` as its OWN, mutually
 * independent `ref`s, exposed on the instance — the counterpart of the
 * source's `TextRollHarness.test.svelte`. That independence is load-bearing
 * for two regression tests below (the backstop must restart on neither a
 * `direction`-only nor a `duration`-only change, and a `direction`-only
 * change must still reach `data-direction`): `@testing-library/vue`'s
 * `rerender()` merges a whole prop object into ONE call, which would bump
 * `value`'s own watch source too if it went through props instead.
 */
const TextRollHarness = defineComponent({
	setup(_props, { expose }) {
		const value = ref("A");
		const direction = ref<"auto" | "up" | "down">("up");
		// Seeded with TextRoll's OWN default so the harness starts out
		// indistinguishable from `<TextRoll value="A" />` — a test that never
		// calls `setDuration` gets the default-duration timings the other
		// suites assume.
		const duration = ref<number>(DURATIONS.base);

		expose({
			setValue: (next: string) => {
				value.value = next;
			},
			setDirection: (next: "auto" | "up" | "down") => {
				direction.value = next;
			},
			setDuration: (next: number) => {
				duration.value = next;
			},
		});

		return () => h(TextRoll, { value: value.value, direction: direction.value, duration: duration.value });
	},
});

describe("TextRoll", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("renders the real layer with the initial value and no rolling state on first mount", () => {
		const { container } = render(TextRoll, { props: { value: "Hello" } });

		expect(realLayer(container).textContent).toBe("Hello");
		expect(root(container).dataset.state).toBe("idle");
	});

	it("merges an extra class onto the root without losing its own", () => {
		const { container } = render(TextRoll, { props: { value: "x", class: "my-8" } });

		expect(root(container).classList.contains("ft-textroll")).toBe(true);
		expect(root(container).classList.contains("my-8")).toBe(true);
	});

	it("passes arbitrary HTML attributes through to the root", () => {
		const { container } = render(TextRoll, { props: { value: "x" }, attrs: { id: "score" } });

		expect(root(container).id).toBe("score");
	});

	it("never lets restProps clobber the component's own data-state/data-direction", () => {
		const { container } = render(TextRoll, {
			props: { value: "x" },
			attrs: { "data-state": "bogus", "data-direction": "sideways" },
		});

		expect(root(container).dataset.state).toBe("idle");
		expect(root(container).dataset.direction).toBe("up");
	});

	describe("grapheme segmentation", () => {
		it("splits plain ASCII into one cell per character", () => {
			const { container } = render(TextRoll, { props: { value: "abc" } });
			expect(cellEls(container).map((c) => c.textContent)).toEqual(["a", "b", "c"]);
		});

		it("groups a ZWJ family emoji into a single cell", () => {
			const family = "\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}"; // 👨‍👩‍👧‍👦
			const { container } = render(TextRoll, { props: { value: `x${family}y` } });
			expect(cellEls(container).map((c) => c.textContent)).toEqual(["x", family, "y"]);
		});

		it("groups a composed accent (e + combining acute) into a single cell", () => {
			const cafe = "café"; // "café" with a combining acute, not the precomposed codepoint
			const { container } = render(TextRoll, { props: { value: cafe } });
			expect(cellEls(container).map((c) => c.textContent)).toEqual(["c", "a", "f", "é"]);
		});

		it("falls back to one crossfading cell when Intl.Segmenter is unavailable", () => {
			const real = Intl.Segmenter;
			Reflect.deleteProperty(Intl, "Segmenter");

			try {
				const { container } = render(TextRoll, { props: { value: "abc" } });
				expect(cellEls(container).map((c) => c.textContent)).toEqual(["abc"]);
			} finally {
				// The lib types mark Intl.Segmenter read-only; restore through a
				// type-erased handle, mirroring how it was removed above.
				(Intl as unknown as { Segmenter: typeof Intl.Segmenter }).Segmenter = real;
			}
		});

		it("keeps a space as its own real, non-empty cell", () => {
			// "Spaces are real cells" — the node must exist AND hold the
			// actual space character (jsdom cannot verify rendered width;
			// that is what `white-space: pre` on the root is for, see the
			// CSS).
			const { container } = render(TextRoll, { props: { value: "a b" } });
			const cells = cellEls(container);
			expect(cells.map((c) => c.textContent)).toEqual(["a", " ", "b"]);
			expect(cells[1]?.textContent).toBe(" ");
		});
	});

	describe("accessible copy round-trip", () => {
		it("keeps the real layer as the one authoritative, unsplit copy", () => {
			const { container } = render(TextRoll, { props: { value: "42%" } });

			expect(realLayer(container).textContent).toBe("42%");
			expect(cellsLayer(container).getAttribute("aria-hidden")).toBe("true");
			// Excluding the aria-hidden cell layer (which visually mirrors
			// every grapheme, so a raw textContent check would see the value
			// twice), the value appears exactly once.
			expect(accessibleText(root(container))).toBe("42%");
		});
	});

	describe("live region", () => {
		it("adds no role or aria-live at all when live is off (the default)", () => {
			const { container } = render(TextRoll, { props: { value: "x" } });
			const real = realLayer(container);
			expect(real.hasAttribute("role")).toBe(false);
			expect(real.hasAttribute("aria-live")).toBe(false);
		});

		it('sets role="status" aria-live="polite" on the real layer for live="polite"', () => {
			const { container } = render(TextRoll, { props: { value: "x", live: "polite" } });
			const real = realLayer(container);
			expect(real.getAttribute("role")).toBe("status");
			expect(real.getAttribute("aria-live")).toBe("polite");
			expect(cellsLayer(container).getAttribute("aria-hidden")).toBe("true");
		});

		it('sets role="alert" aria-live="assertive" on the real layer for live="assertive"', () => {
			const { container } = render(TextRoll, { props: { value: "x", live: "assertive" } });
			const real = realLayer(container);
			expect(real.getAttribute("role")).toBe("alert");
			expect(real.getAttribute("aria-live")).toBe("assertive");
		});
	});

	it("applies tabular-nums to both layers when tabular is set", () => {
		const { container } = render(TextRoll, { props: { value: "1,234", tabular: true } });

		expect(realLayer(container).style.getPropertyValue("font-variant-numeric")).toBe(
			"tabular-nums"
		);
		expect(cellsLayer(container).style.getPropertyValue("font-variant-numeric")).toBe(
			"tabular-nums"
		);
	});

	it("leaves font-variant-numeric unset when tabular is false (the default)", () => {
		const { container } = render(TextRoll, { props: { value: "1,234" } });

		expect(realLayer(container).style.getPropertyValue("font-variant-numeric")).toBe("");
		expect(cellsLayer(container).style.getPropertyValue("font-variant-numeric")).toBe("");
	});

	describe("direction resolution", () => {
		it('resolves "auto" to "up" for a numeric increase', async () => {
			const { container, rerender } = render(TextRoll, { props: { value: "05" } });
			await rerender({ value: "10" });
			expect(root(container).dataset.direction).toBe("up");
		});

		it('resolves "auto" to "down" for a numeric decrease', async () => {
			const { container, rerender } = render(TextRoll, { props: { value: "10" } });
			await rerender({ value: "05" });
			expect(root(container).dataset.direction).toBe("down");
		});

		it('falls back to "up" for a non-numeric change', async () => {
			const { container, rerender } = render(TextRoll, { props: { value: "READY" } });
			await rerender({ value: "BUSY " });
			expect(root(container).dataset.direction).toBe("up");
		});

		it('falls back to "up" rather than reading an empty side as zero (Number("") footgun)', async () => {
			const { container, rerender } = render(TextRoll, { props: { value: "" } });
			await rerender({ value: "5" });
			expect(root(container).dataset.direction).toBe("up");

			const { container: container2, rerender: rerender2 } = render(TextRoll, {
				props: { value: "5" },
			});
			await rerender2({ value: "" });
			expect(root(container2).dataset.direction).toBe("up");
		});

		it("a direction-only change reaches data-direction with no new value", async () => {
			// Uses the harness rather than `rerender()` for the reason its own
			// header comment gives: testing-library's `rerender()` merges the
			// whole prop object in one call, so a `direction`-only change
			// through it would still be indistinguishable from a fresh
			// `value` in the underlying watch source.
			const wrapper = mount(TextRollHarness);

			try {
				const rootEl = () => wrapper.get(".ft-textroll").element as HTMLElement;

				expect(rootEl().dataset.direction).toBe("up");

				(wrapper.vm as unknown as TextRollHarnessInstance).setDirection("down");
				await nextTick();

				expect(rootEl().dataset.direction).toBe("down");
			} finally {
				wrapper.unmount();
			}
		});

		it("an explicit direction is never overridden by the numeric comparison", async () => {
			const { container, rerender } = render(TextRoll, {
				props: { value: "5", direction: "down" as const },
			});
			expect(root(container).dataset.direction).toBe("down");

			await rerender({ value: "10", direction: "down" as const });
			expect(root(container).dataset.direction).toBe("down");
		});
	});

	describe("keyed diff", () => {
		it("keeps the DOM node for a grapheme that did not change, replaces only the one that did", async () => {
			const { container, rerender } = render(TextRoll, { props: { value: "12:00" } });
			const before = cellEls(container);
			expect(before.map((c) => c.textContent)).toEqual(["1", "2", ":", "0", "0"]);

			await rerender({ value: "12:01" });
			await waitFor(() => {
				expect(cellEls(container).map((c) => c.textContent)).toEqual(["1", "2", ":", "0", "1"]);
			});

			const after = cellEls(container);
			expect(after[0]).toBe(before[0]);
			expect(after[1]).toBe(before[1]);
			expect(after[2]).toBe(before[2]);
			expect(after[3]).toBe(before[3]);
			expect(after[4]).not.toBe(before[4]);
		});

		it("replaces every cell on a length change, even a leading grapheme that did not change", async () => {
			const { container, rerender } = render(TextRoll, { props: { value: "1" } });
			const before = cellEls(container)[0];

			await rerender({ value: "10" });
			await waitFor(() => {
				expect(cellEls(container).map((c) => c.textContent)).toEqual(["1", "0"]);
			});

			expect(cellEls(container)[0]).not.toBe(before);
		});
	});

	it("flips to rolling on a value change, then settles back to idle", async () => {
		// The ambient `Element.prototype.animate` stub in `test-setup.ts`
		// resolves `onfinish` on a bare `queueMicrotask` — fast enough that an
		// enter/leave pair starts AND finishes inside one microtask flush,
		// before any external observer gets a turn to see "rolling" in
		// between. A controllable stub lets this test hold each transition
		// open long enough to observe the intermediate state on purpose, then
		// resolve it itself to verify the OTHER path back to idle: the normal
		// enter/leave-end bookkeeping, not the timeout backstop.
		vi.useFakeTimers();
		const realAnimate = Element.prototype.animate;
		const finishers: Array<() => void> = [];
		Element.prototype.animate = function controlledAnimate() {
			const anim = {
				playState: "running",
				currentTime: 0,
				effect: null,
				onfinish: null as (() => void) | null,
				oncancel: null,
				cancel() {},
				finish() {},
				play() {},
				pause() {},
				reverse() {},
				updatePlaybackRate() {},
				commitStyles() {},
				persist() {},
				addEventListener() {},
				removeEventListener() {},
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} as any;
			finishers.push(() => anim.onfinish?.());
			return anim;
		};

		try {
			const { container, rerender } = render(TextRoll, { props: { value: "A" } });
			expect(root(container).dataset.state).toBe("idle");

			await rerender({ value: "B" });
			await vi.advanceTimersByTimeAsync(0);
			expect(root(container).dataset.state).toBe("rolling");

			// Drain every in-flight cell animation ourselves — this is the
			// enter/leave-end path, distinct from the dedicated backstop test
			// below.
			while (finishers.length > 0) {
				const finish = finishers.shift();
				finish?.();
			}
			await vi.advanceTimersByTimeAsync(0);
			await nextTick();

			expect(root(container).dataset.state).toBe("idle");
			// The real layer is correct throughout, not just once settled.
			expect(realLayer(container).textContent).toBe("B");
		} finally {
			Element.prototype.animate = realAnimate;
			vi.useRealTimers();
		}
	});

	it("does not throw on rapid consecutive updates and ends idle", async () => {
		const { container, rerender } = render(TextRoll, { props: { value: "0" } });

		for (const next of ["1", "2", "3", "4", "5"]) {
			await rerender({ value: next });
		}

		await waitFor(() => {
			expect(root(container).dataset.state).toBe("idle");
		});
		expect(realLayer(container).textContent).toBe("5");
	});

	describe("reduced motion", () => {
		it("swaps synchronously (duration and stagger collapsed to zero)", async () => {
			stubMatchMedia(true);

			// The discriminating signal for "the duration:0 branch actually
			// ran", not just "the end state happens to look the same": with
			// `duration` collapsed to `0`, the transition sampler returns
			// before ever calling `element.animate` — so on the normal
			// (non-reduced) path this spy WOULD have recorded calls (see the
			// "flips to rolling" test above), and here it must record none.
			const animateSpy = vi.spyOn(Element.prototype, "animate");

			const { container, rerender } = render(TextRoll, { props: { value: "A" } });
			await rerender({ value: "B" });
			await nextTick();

			expect(realLayer(container).textContent).toBe("B");
			expect(root(container).dataset.state).toBe("idle");
			expect(animateSpy).not.toHaveBeenCalled();
		});
	});

	describe("hard timeout backstop", () => {
		// At the default `duration`/`stagger` props this is
		// `DURATIONS.base(300) + STAGGER_CAPS.text(200) + DURATIONS.fast(150)`
		// = 650, which is itself above the 600ms floor — computed here, not
		// hardcoded, so a deliberate change to any of those three tokens
		// doesn't leave this test asserting a stale number.
		const expectedBackstopMs = Math.max(
			DURATIONS.entrance,
			DURATIONS.base + STAGGER_CAPS.text + DURATIONS.fast
		);

		function stuckAnimate() {
			return {
				playState: "running",
				currentTime: 0,
				effect: null,
				onfinish: null,
				oncancel: null,
				cancel() {},
				finish() {},
				play() {},
				pause() {},
				reverse() {},
				updatePlaybackRate() {},
				commitStyles() {},
				persist() {},
				addEventListener() {},
				removeEventListener() {},
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} as any;
		}

		it("returns to idle at the computed backstop even if a cell's transition-end event never fires", async () => {
			vi.useFakeTimers();
			const realAnimate = Element.prototype.animate;
			// An animation that starts but never calls `onfinish` — simulates
			// an interrupted/dropped transition-end event, leaving ONLY the
			// unconditional setTimeout backstop able to recover the state.
			Element.prototype.animate = stuckAnimate;

			try {
				const { container, rerender } = render(TextRoll, { props: { value: "A" } });
				await rerender({ value: "B" });
				await vi.advanceTimersByTimeAsync(0);
				expect(root(container).dataset.state).toBe("rolling");

				// One tick before the backstop: still rolling, proving the
				// timer did not fire early and truncate the (longer than
				// 600ms) default-duration roll.
				await vi.advanceTimersByTimeAsync(expectedBackstopMs - 1);
				expect(root(container).dataset.state).toBe("rolling");

				await vi.advanceTimersByTimeAsync(1);
				expect(root(container).dataset.state).toBe("idle");
			} finally {
				Element.prototype.animate = realAnimate;
				vi.useRealTimers();
			}
		});

		it("does not restart the countdown on a same-value direction-only change", async () => {
			// Discriminates the bug from the fix: a `direction`-only change
			// must not re-arm the backstop over a roll it did not start. If
			// it wrongly re-armed a fresh window instead, advancing only just
			// past the ORIGINAL deadline would still find the component
			// "rolling" — this test fails loudly under that regression
			// rather than passing either way. Uses `TextRollHarness` (own
			// independent `ref` per field) rather than `render()` +
			// `rerender()`, for the reason given at the harness's own
			// definition above.
			vi.useFakeTimers();
			const realAnimate = Element.prototype.animate;
			Element.prototype.animate = stuckAnimate;

			const wrapper = mount(TextRollHarness);

			try {
				const rootEl = () => wrapper.get(".ft-textroll").element as HTMLElement;

				(wrapper.vm as unknown as TextRollHarnessInstance).setValue("B");
				await nextTick();
				await vi.advanceTimersByTimeAsync(expectedBackstopMs - 50);
				expect(rootEl().dataset.state).toBe("rolling");

				// Same `value`, `direction` flipped — must not re-arm.
				(wrapper.vm as unknown as TextRollHarnessInstance).setDirection("down");
				await nextTick();

				// Only just past the ORIGINAL deadline. A restarted timer
				// would need a whole new window from here and still read
				// "rolling".
				await vi.advanceTimersByTimeAsync(60);
				expect(rootEl().dataset.state).toBe("idle");
			} finally {
				wrapper.unmount();
				Element.prototype.animate = realAnimate;
				vi.useRealTimers();
			}
		});

		it("keeps the window sized for the duration the roll started with, ignoring a mid-roll duration change", async () => {
			// The WAAPI transitions already running keep the duration they
			// were created with, so the backstop must not be re-sized (nor
			// re-armed from "now") when `duration` changes underneath them.
			// Collapsing a running roll's duration to `0` is the loud
			// version of the bug: the backstop would drop to the 600ms
			// floor, measured from the change, and either cut the roll
			// short or — as asserted here — stretch it well past its own
			// deadline.
			vi.useFakeTimers();
			const realAnimate = Element.prototype.animate;
			Element.prototype.animate = stuckAnimate;

			const wrapper = mount(TextRollHarness);

			try {
				const rootEl = () => wrapper.get(".ft-textroll").element as HTMLElement;

				(wrapper.vm as unknown as TextRollHarnessInstance).setValue("B");
				await nextTick();
				await vi.advanceTimersByTimeAsync(expectedBackstopMs - 50);
				expect(rootEl().dataset.state).toBe("rolling");

				// Same `value`, `duration` collapsed — must not re-arm.
				(wrapper.vm as unknown as TextRollHarnessInstance).setDuration(0);
				await nextTick();

				// Just past the ORIGINAL deadline. A re-armed timer would run
				// a whole fresh window from the change above and still read
				// "rolling" here.
				await vi.advanceTimersByTimeAsync(50);
				expect(rootEl().dataset.state).toBe("idle");
			} finally {
				wrapper.unmount();
				Element.prototype.animate = realAnimate;
				vi.useRealTimers();
			}
		});
	});

	describe("roll-transitions (pure)", () => {
		// Pure-function assertions on the actual visual grammar these two
		// transitions encode — no DOM rendering, no WAAPI stub involved.
		const el = document.createElement("span");

		it("rollIn on a shared direction moves the opposite way from rollOut (the wheel-turning sign convention)", () => {
			const params = { direction: "up" as const, duration: 300, index: 0, count: 5, step: 0 };
			expect(rollIn(el, params).css?.(0, 1)).toContain("calc(1 *");
			expect(rollOut(el, params).css?.(0, 1)).toContain("calc(-1 *");
		});

		it("preserves an explicit duration:0 (reduced motion) rather than falling back to the default", () => {
			const params = {
				direction: "up" as const,
				duration: 0,
				index: 0,
				count: 5,
				step: 0,
			};
			expect(rollIn(el, params).duration).toBe(0);
		});

		it("compresses a late index's delay to the STAGGER_CAPS.text ceiling", () => {
			const params = {
				direction: "up" as const,
				duration: 300,
				index: 19,
				count: 20,
				step: 15,
			};
			expect(rollIn(el, params).delay).toBeLessThanOrEqual(STAGGER_CAPS.text);
		});
	});

	describe("cleanup", () => {
		it("does not leave a dangling backstop timer running against a destroyed component", async () => {
			vi.useFakeTimers();
			try {
				const { unmount, rerender } = render(TextRoll, { props: { value: "A" } });
				await rerender({ value: "B" });

				unmount();

				expect(() => vi.advanceTimersByTime(1000)).not.toThrow();
			} finally {
				vi.useRealTimers();
			}
		});

		it("unmounting mid-roll does not throw", async () => {
			const { unmount, rerender } = render(TextRoll, { props: { value: "A" } });
			await rerender({ value: "B" });

			expect(() => unmount()).not.toThrow();
		});
	});
});
