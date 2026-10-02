import { render, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/vue";
import { defineComponent, h, nextTick, ref, type PropType } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import Skeleton from "./Skeleton.vue";

// Skeleton's motion is entirely CSS-gated (no JS reduced-motion check, no
// listener/observer/timer of any kind besides the phase-sync effect below),
// so there is no unmount cleanup to exercise here — the common contract's
// "cleanup-on-unmount test" clause is scoped to components that actually
// register something to tear down.

function bones(container: Element): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>(".ft-skeleton-bone"));
}

function root(container: Element): HTMLElement {
	return container.firstElementChild as HTMLElement;
}

const CHILDREN_SLOT = { default: "<p>Real content</p>" };

/**
 * Test-only rig for the reveal. `loading` is held as local state and flipped
 * from a button inside this component, deliberately, rather than driven from
 * the test through `rerender()`: `rerender` merges props and awaits a tick of
 * its own, so a test using it can never observe the ONE flush the fade lives
 * in. A click flips the state synchronously, so a single `await nextTick()`
 * after it lands inside the fade window.
 *
 * Children are a real slot with real interactive content, because two of the
 * things the reveal must guarantee are about the content, not the bones:
 * that it is queryable immediately rather than after the fade, and that it
 * is clickable while the bones are still painted over it.
 *
 * Not exported from index.ts, and inlined here per the porting law rather
 * than a separate `.test.vue` harness — the template is small enough to
 * inline.
 */
const RevealHarness = defineComponent({
	name: "SkeletonRevealHarness",
	props: {
		/** Forwarded straight through, so one rig covers every variant. */
		variant: { type: String as PropType<"rect" | "text" | "circle">, default: "text" },
		lines: { type: Number, default: 2 },
		label: { type: String, default: "Loading" },
		/** Called when the revealed content is clicked. */
		onContentClick: { type: Function as PropType<() => void>, default: undefined },
	},
	setup(props) {
		// Always starts loading, so the first click is a genuine reveal.
		const loading = ref(true);
		return () =>
			h("div", [
				h(
					"button",
					{
						type: "button",
						"data-testid": "toggle",
						onClick: () => {
							loading.value = !loading.value;
						},
					},
					"toggle"
				),
				h(
					Skeleton,
					{
						loading: loading.value,
						variant: props.variant,
						lines: props.lines,
						label: props.label,
						class: "w-48",
					},
					{
						default: () =>
							h("p", [
								"Real content ",
								h(
									"button",
									{
										type: "button",
										"data-testid": "content-button",
										onClick: () => props.onContentClick?.(),
									},
									"act"
								),
							]),
					}
				),
			]);
	},
});

describe("Skeleton", () => {
	afterEach(cleanup);

	it("renders one bone for the rect default", () => {
		const { container } = render(Skeleton);
		expect(bones(container)).toHaveLength(1);
		expect(root(container)).toHaveAttribute("data-variant", "rect");
	});

	it("renders `lines` bones for variant=text, with only the last one short", () => {
		const { container } = render(Skeleton, { props: { variant: "text", lines: 3 } });
		const rows = bones(container);
		expect(rows).toHaveLength(3);
		expect(rows[0]).not.toHaveClass("ft-skeleton-bone--short");
		expect(rows[1]).not.toHaveClass("ft-skeleton-bone--short");
		expect(rows[2]).toHaveClass("ft-skeleton-bone--short");
	});

	it("does not mark a single text line short", () => {
		const { container } = render(Skeleton, { props: { variant: "text", lines: 1 } });
		const rows = bones(container);
		expect(rows).toHaveLength(1);
		expect(rows[0]).not.toHaveClass("ft-skeleton-bone--short");
	});

	it("floors a fractional `lines`", () => {
		const { container } = render(Skeleton, { props: { variant: "text", lines: 2.9 } });
		expect(bones(container)).toHaveLength(2);
	});

	it("clamps a non-positive `lines` up to 1", () => {
		const { container } = render(Skeleton, { props: { variant: "text", lines: 0 } });
		expect(bones(container)).toHaveLength(1);
	});

	it("falls back to 1 for a non-finite `lines` (NaN)", () => {
		const { container } = render(Skeleton, { props: { variant: "text", lines: Number.NaN } });
		expect(bones(container)).toHaveLength(1);
	});

	it("marks every bone aria-hidden", () => {
		const { container } = render(Skeleton, { props: { variant: "text", lines: 2 } });
		for (const bone of bones(container)) {
			expect(bone).toHaveAttribute("aria-hidden", "true");
		}
	});

	it("reflects variant, animation, and loading as data attributes", () => {
		const { container } = render(Skeleton, { props: { variant: "circle", animation: "pulse" } });
		expect(root(container)).toHaveAttribute("data-variant", "circle");
		expect(root(container)).toHaveAttribute("data-animation", "pulse");
		expect(root(container)).toHaveAttribute("data-loading", "true");
	});

	it("merges a caller-supplied style with the internal phase custom property", async () => {
		Object.defineProperty(document, "timeline", {
			configurable: true,
			value: { currentTime: 3700 },
		});
		try {
			const { container } = render(Skeleton, { attrs: { style: "width: 12rem" } });
			// The phase is written from `onMounted`, which flushes to the DOM on
			// the next microtask under Vue — unlike the Svelte/React sources,
			// where the mount effect's write is visible synchronously once
			// `render()` returns.
			await nextTick();
			const style = root(container).getAttribute("style") ?? "";
			expect(style).toContain("width: 12rem");
			expect(style).toContain("--ft-skeleton-phase: -500ms");
		} finally {
			Reflect.deleteProperty(document, "timeline");
		}
	});

	describe("standalone mode (no slot content)", () => {
		it("puts role=status and aria-live=polite on the root, with one sr-only label", () => {
			render(Skeleton);
			const status = screen.getByRole("status");
			expect(status).toHaveAttribute("aria-live", "polite");
			expect(within(status).getByText("Loading")).toHaveClass("sr-only");
		});

		it("silences the announcement entirely when label is an empty string", () => {
			const { container } = render(Skeleton, { props: { label: "" } });
			const status = screen.getByRole("status");
			expect(status).toBe(root(container));
			expect(container.querySelector(".sr-only")).toBeNull();
		});

		it("renders nothing at all when loading is false and there is no content to swap to", () => {
			const { container } = render(Skeleton, { props: { loading: false } });
			expect(container.firstElementChild).toBeNull();
			expect(screen.queryByRole("status")).toBeNull();
		});
	});

	describe("wrapping mode (slot content present)", () => {
		it("hides content behind the bones while loading, with aria-busy and exactly one inner status span", () => {
			const { container } = render(Skeleton, {
				props: { loading: true },
				slots: CHILDREN_SLOT,
			});
			const el = root(container);
			expect(el).not.toHaveAttribute("role", "status");
			expect(el).toHaveAttribute("aria-busy", "true");
			expect(bones(container).length).toBeGreaterThan(0);
			expect(container.textContent).not.toContain("Real content");

			const statuses = container.querySelectorAll('[role="status"]');
			expect(statuses).toHaveLength(1);
			expect(statuses[0]).not.toBe(el);
			expect(statuses[0]).toHaveAttribute("aria-live", "polite");
		});

		it("swaps to content once loading is false, leaving no bones and an emptied status region", () => {
			const { container } = render(Skeleton, {
				props: { loading: false },
				slots: CHILDREN_SLOT,
			});
			expect(container.textContent).toContain("Real content");
			expect(bones(container)).toHaveLength(0);
			const status = container.querySelector('[role="status"]');
			expect(status).not.toBeNull();
			expect(status?.textContent).toBe("");
			expect(root(container)).not.toHaveAttribute("aria-busy");
			expect(root(container)).not.toHaveAttribute("data-loading");
		});

		it("keeps the live region mounted across a loading toggle — turning loading on is a text change, not an insertion", async () => {
			// A live region inserted already populated is announced unreliably;
			// assistive tech has to see the region before its text changes. The
			// same node has to survive the false → true reuse flow for that.
			const { container, rerender } = render(Skeleton, {
				props: { loading: false },
				slots: CHILDREN_SLOT,
			});
			const status = container.querySelector('[role="status"]');
			expect(status).not.toBeNull();
			expect(status?.textContent).toBe("");

			await rerender({ loading: true });

			expect(container.querySelector('[role="status"]')).toBe(status);
			expect(status?.textContent).toBe("Loading");
		});

		it("silences the inner status span too when label is an empty string", () => {
			const { container } = render(Skeleton, {
				props: { loading: true, label: "" },
				slots: CHILDREN_SLOT,
			});
			expect(container.querySelector('[role="status"]')).toBeNull();
			expect(bones(container).length).toBeGreaterThan(0);
		});
	});

	// The reveal: the bones no longer cut to the content, they fade out on top
	// of it. Everything below is about the window between those two — which is
	// 200ms in a browser and a couple of microtasks under the WAAPI stub, so
	// the flip is driven by a CLICK inside the harness and observed after ONE
	// `nextTick()`. `rerender()` merges and awaits a tick of its own and would
	// drain the stub's microtask chain before the assertion ever ran, turning
	// every one of these into a false negative.
	describe("the reveal (wrapping mode)", () => {
		function overlay(container: Element): HTMLElement | null {
			return container.querySelector<HTMLElement>(".ft-skeleton-bones-out");
		}

		// A RAW `.click()`, never `fireEvent.click`: testing-library's helper
		// awaits a tick of its own, which would spend the one flush the fade
		// lives in before the assertion ran.
		function reveal(container: Element): Promise<void> {
			within(container as HTMLElement)
				.getByTestId("toggle")
				.click();
			return nextTick();
		}

		it("keeps the bones on screen, aria-hidden and out of flow, then drops them", async () => {
			const { container } = render(RevealHarness);
			expect(bones(container).length).toBe(2);

			await reveal(container);

			const lingering = overlay(container);
			expect(lingering).not.toBeNull();
			expect(lingering).toHaveAttribute("aria-hidden", "true");
			expect(bones(container).length).toBe(2);
			// The bones that are left are the overlay's, never in-flow ones: the
			// content is what sizes the root from the first frame.
			for (const bone of bones(container)) {
				expect(lingering!.contains(bone)).toBe(true);
			}

			await waitFor(() => expect(overlay(container)).toBeNull());
			expect(bones(container)).toHaveLength(0);
		});

		// The whole point of the design. If the content only became queryable
		// once the fade ended, the reveal would be a 200ms hole in the page
		// rather than a dissolve over content that is already there.
		it("hands over the real content immediately, not after the fade", async () => {
			const onContentClick = vi.fn();
			const { container } = render(RevealHarness, { props: { onContentClick } });

			await reveal(container);

			expect(container.textContent).toContain("Real content");
			// And it is interactive while the bones are still painted over it:
			// the overlay is `pointer-events: none`, asserted below.
			await fireEvent.click(within(container as HTMLElement).getByTestId("content-button"));
			expect(onContentClick).toHaveBeenCalledTimes(1);
		});

		// jsdom applies no stylesheet, so the property itself is unobservable
		// here; the class that carries it is the testable half. `.ft-skeleton-
		// bones-out` exists for exactly two declarations — `position: absolute`
		// and `pointer-events: none` — and a tidy-up that drops either one
		// would make the reveal cover the content it is fading over.
		it("puts the lingering bones in the class that takes them out of flow and out of the way", async () => {
			const { container } = render(RevealHarness);

			await reveal(container);

			expect(overlay(container)).not.toBeNull();
			expect(overlay(container)!.className).toContain("ft-skeleton-bones-out");
		});

		// A live region that outlives its own ANNOUNCEMENT is the bug the
		// component's own comment warns about — not the region itself, which
		// deliberately stays mounted so a later `loading` flip is a text
		// change rather than an insertion (see the toggle test above; an
		// already-populated region inserted fresh is announced unreliably).
		// What must not survive the reveal is the TEXT, and the overlay must
		// never carry a second copy of the region into the fade.
		it("empties the status span with the in-flow bones rather than lingering the announcement into the fade", async () => {
			const { container } = render(RevealHarness);
			const status = container.querySelector('[role="status"]');
			expect(container.querySelectorAll('[role="status"]')).toHaveLength(1);
			expect(status?.textContent).not.toBe("");

			await reveal(container);

			// The same node, emptied — not a second one, and not one copied
			// into the lingering bones.
			expect(container.querySelectorAll('[role="status"]')).toHaveLength(1);
			expect(container.querySelector('[role="status"]')).toBe(status);
			expect(status?.textContent).toBe("");
			expect(overlay(container)!.querySelector('[role="status"]')).toBeNull();
			// aria-busy goes at the same instant, for the same reason.
			expect(container.querySelector(".ft-skeleton")).not.toHaveAttribute("aria-busy");
		});

		// `duration: 0` finishes the outro synchronously and never touches
		// `element.animate()`, so a visitor who asked for less motion gets
		// exactly the instant swap this component had before the reveal
		// existed — the overlay is gone in the same tick it mounted.
		it("reduced motion: swaps instantly, with no overlay and no animation", async () => {
			vi.stubGlobal("matchMedia", (query: string) => ({
				matches: /prefers-reduced-motion:\s*reduce\b/.test(query),
				media: query,
				onchange: null,
				addEventListener: () => {},
				removeEventListener: () => {},
				dispatchEvent: () => false,
				addListener: () => {},
				removeListener: () => {},
			}));
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			try {
				const { container } = render(RevealHarness);

				await reveal(container);

				expect(overlay(container)).toBeNull();
				expect(bones(container)).toHaveLength(0);
				expect(container.textContent).toContain("Real content");
				expect(animateSpy).not.toHaveBeenCalled();
			} finally {
				animateSpy.mockRestore();
				vi.unstubAllGlobals();
			}
		});

		// Mounting already revealed is not a reveal: there is nothing to fade
		// out, and a set of bones flashed over content that was never hidden
		// would be a new defect rather than a nicety.
		it("never flashes bones for a Skeleton that mounts with loading already false", async () => {
			const { container } = render(Skeleton, {
				props: { loading: false },
				slots: CHILDREN_SLOT,
			});

			expect(overlay(container)).toBeNull();
			expect(bones(container)).toHaveLength(0);
			// Not just on the first frame: the arming watcher runs after the
			// first render, and must not arm a reveal that never happened.
			await nextTick();
			expect(overlay(container)).toBeNull();
			expect(bones(container)).toHaveLength(0);
		});

		// Going back to loading re-arms the reveal rather than spending it
		// once per instance — a list that refetches shows its bones again, and
		// the next reveal fades them out the same way the first one did.
		it("re-arms when loading goes true again", async () => {
			const { container } = render(RevealHarness);

			await reveal(container);
			await waitFor(() => expect(overlay(container)).toBeNull());

			// Back to loading: in-flow bones and the live region return.
			await reveal(container);
			expect(overlay(container)).toBeNull();
			expect(bones(container).length).toBe(2);
			expect(container.querySelectorAll('[role="status"]')).toHaveLength(1);

			// And the second reveal lingers exactly like the first.
			await reveal(container);
			expect(overlay(container)).not.toBeNull();
			await waitFor(() => expect(overlay(container)).toBeNull());
		});
	});

	it("merges the class prop with the base classes", () => {
		const { container } = render(Skeleton, { props: { class: "h-4 w-40" } });
		expect(root(container).className).toContain("h-4");
		expect(root(container).className).toContain("w-40");
		expect(root(container).className).toContain("ft-skeleton");
	});

	// Slot presence has to be read during render, not cached in a computed:
	// `useSlots()` is the raw slots object in production (its tracking proxy is
	// dev-only, and even that is only triggered by HMR), so a computed over it
	// never recomputes when a parent re-render adds or drops the slot.
	it("switches between standalone and wrapping mode when the default slot appears or disappears", async () => {
		const withSlot = ref(false);
		const Host = defineComponent({
			setup() {
				return () =>
					h(
						Skeleton,
						{ loading: true },
						withSlot.value ? { default: () => h("p", "Real content") } : {}
					);
			},
		});
		const { container } = render(Host);
		expect(root(container)).toHaveAttribute("role", "status");
		expect(root(container)).not.toHaveAttribute("aria-busy");

		withSlot.value = true;
		await nextTick();
		expect(root(container)).not.toHaveAttribute("role");
		expect(root(container)).toHaveAttribute("aria-busy", "true");

		withSlot.value = false;
		await nextTick();
		expect(root(container)).toHaveAttribute("role", "status");
		expect(root(container)).not.toHaveAttribute("aria-busy");
	});

	describe("shimmer phase sync", () => {
		it("writes a negative --ft-skeleton-phase from document.timeline.currentTime", async () => {
			// 3700 % 1600 = 500, so the shimmer's own 1.6s cycle should be offset
			// -500ms to line this instance up with the shared page timeline.
			Object.defineProperty(document, "timeline", {
				configurable: true,
				value: { currentTime: 3700 },
			});
			try {
				const { container } = render(Skeleton);
				// See the equivalent comment in the style-merge test above.
				await nextTick();
				expect(root(container).getAttribute("style") ?? "").toContain(
					"--ft-skeleton-phase: -500ms"
				);
			} finally {
				// jsdom ships no document.timeline of its own; remove the stub
				// rather than leaving a fake one for later test files.
				Reflect.deleteProperty(document, "timeline");
			}
		});

		it("omits the phase var when document.timeline is unavailable (the real jsdom default)", () => {
			expect(document.timeline).toBeUndefined();
			const { container } = render(Skeleton);
			expect(container.firstElementChild).not.toBeNull();
			expect(root(container).getAttribute("style") ?? "").not.toContain("--ft-skeleton-phase");
		});
	});

	// Reduced motion suppresses the shimmer/pulse animations entirely in CSS
	// (both keyframe rules live inside `@media (prefers-reduced-motion:
	// no-preference)`), so there is no JS branch to exercise here — this test
	// documents the DOM/attribute contract stays correct under the preference,
	// matching the project's own testing boundary (jsdom cannot assert "the
	// gradient doesn't move," only what drives the CSS that does).
	it("reduced motion: the DOM/attribute contract is unaffected", () => {
		const original = window.matchMedia;
		Object.defineProperty(window, "matchMedia", {
			writable: true,
			configurable: true,
			value: (query: string) => ({
				matches: true,
				media: query,
				onchange: null,
				addEventListener: () => {},
				removeEventListener: () => {},
				dispatchEvent: () => false,
				addListener: () => {},
				removeListener: () => {},
			}),
		});
		try {
			const { container } = render(Skeleton, { props: { animation: "shimmer" } });
			expect(root(container)).toHaveAttribute("data-animation", "shimmer");
			expect(bones(container)).toHaveLength(1);
		} finally {
			Object.defineProperty(window, "matchMedia", {
				writable: true,
				configurable: true,
				value: original,
			});
		}
	});
});
