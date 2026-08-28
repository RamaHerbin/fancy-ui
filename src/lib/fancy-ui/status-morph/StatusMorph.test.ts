import { render, cleanup, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StatusMorph from "./StatusMorph.svelte";
import Harness from "./StatusMorphHarness.test.svelte";

// `vi.mock` factories are hoisted above imports and can't close over
// outer-scope bindings, so the mock fn itself has to come from `vi.hoisted` —
// same shape as `Pressable.test.ts`'s own haptics mock.
const { vibrateMock } = vi.hoisted(() => ({ vibrateMock: vi.fn(() => true) }));
vi.mock("../_internals/motion/haptics.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../_internals/motion/haptics.js")>();
	return { ...actual, canVibrate: () => true, vibrate: vibrateMock };
});

function shapes(container: HTMLElement) {
	return {
		track: container.querySelector(".ft-statusmorph-track"),
		arc: container.querySelector(".ft-statusmorph-arc"),
		check: container.querySelector(".ft-statusmorph-check"),
		crossA: container.querySelector(".ft-statusmorph-cross-a"),
		crossB: container.querySelector(".ft-statusmorph-cross-b"),
	};
}

function root(container: HTMLElement): HTMLElement {
	return container.firstElementChild as HTMLElement;
}

function liveRegion(): HTMLElement {
	return document.body.querySelector('[role="status"]') as HTMLElement;
}

/** Same minimal shape as `Magnetic.test.ts`'s `stubMatchMedia` — reduced
 * motion is fixed per test, no live change event needed here. */
function stubMatchMedia(matches: boolean) {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		configurable: true,
		value: (query: string) => ({
			matches,
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
			addListener: () => {},
			removeListener: () => {},
		}),
	});
}

describe("StatusMorph", () => {
	beforeEach(() => {
		vibrateMock.mockClear();
	});

	afterEach(() => {
		cleanup();
		// The portalled live region is appended to document.body directly, so a
		// leftover node from render() without a matching unmount (e.g. `render`
		// calls not paired with `cleanup` timing) would otherwise bleed into the
		// next test's `document.body.querySelector` lookups.
		document.body.querySelectorAll('[role="status"]').forEach((el) => el.remove());
	});

	it("defaults to idle with all five shapes present (the CLS-free scaffold) and an empty live region", () => {
		const { container } = render(StatusMorph);
		expect(root(container)).toHaveAttribute("data-state", "idle");
		const svg = container.querySelector(".ft-statusmorph-svg");
		expect(svg).toHaveAttribute("data-state", "idle");

		const { track, arc, check, crossA, crossB } = shapes(container);
		expect(track).not.toBeNull();
		expect(arc).not.toBeNull();
		expect(check).not.toBeNull();
		expect(crossA).not.toBeNull();
		expect(crossB).not.toBeNull();

		expect(liveRegion().textContent).toBe("");
		expect(liveRegion()).toHaveAttribute("aria-live", "polite");
	});

	it("reflects state on both the root and the svg, and updates the live text", () => {
		const { container, rerender } = render(StatusMorph, { props: { state: "loading" } });
		expect(root(container)).toHaveAttribute("data-state", "loading");
		expect(container.querySelector(".ft-statusmorph-svg")).toHaveAttribute("data-state", "loading");
		expect(liveRegion().textContent).toBe("Loading");

		rerender({ state: "success" });
		expect(root(container)).toHaveAttribute("data-state", "success");
		expect(liveRegion().textContent).toBe("Done");

		rerender({ state: "error" });
		expect(root(container)).toHaveAttribute("data-state", "error");
		expect(liveRegion().textContent).toBe("Failed");
		expect(liveRegion()).toHaveAttribute("aria-live", "assertive");
	});

	it("merges partial custom labels over the defaults", () => {
		const { rerender } = render(StatusMorph, {
			props: { state: "success", labels: { success: "Saved!" } },
		});
		expect(liveRegion().textContent).toBe("Saved!");

		rerender({ state: "loading", labels: { success: "Saved!" } });
		// `loading` wasn't overridden, so it still falls back to the default.
		expect(liveRegion().textContent).toBe("Loading");
	});

	it("reflects tone as a data attribute", () => {
		const { container } = render(StatusMorph, { props: { tone: "semantic" } });
		expect(root(container)).toHaveAttribute("data-tone", "semantic");
	});

	it("renders no idle wrapper at all when no idle snippet is given", () => {
		const { container } = render(StatusMorph);
		expect(container.querySelector(".ft-statusmorph-idle")).toBeNull();
	});

	it("renders provided idle content alongside the (still-mounted) transparent SVG scaffold", () => {
		// The SVG itself is asserted as still-present, not conditionally
		// unmounted: unmounting it on every idle↔loading flip would mean it
		// remounts fresh with no prior style to transition FROM, which would
		// silently break the arc/track fade-in transitions the design relies on.
		const idleContent = createRawSnippet(() => ({ render: () => "<b>Ready</b>" }));
		const { container } = render(StatusMorph, { props: { idle: idleContent } });

		const wrapper = container.querySelector(".ft-statusmorph-idle");
		expect(wrapper).not.toBeNull();
		expect(wrapper?.textContent).toBe("Ready");
		expect(container.querySelector(".ft-statusmorph-svg")).not.toBeNull();
	});

	describe("resetAfter", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});
		afterEach(() => {
			vi.useRealTimers();
		});

		it("auto-resets to idle resetAfter ms after entering success (default 1800ms)", async () => {
			const { getByTestId } = render(Harness, { props: { state: "success" } });
			expect(getByTestId("bound-state").textContent).toBe("success");

			await vi.advanceTimersByTimeAsync(1799);
			expect(getByTestId("bound-state").textContent).toBe("success");

			await vi.advanceTimersByTimeAsync(1);
			expect(getByTestId("bound-state").textContent).toBe("idle");
		});

		it("never resets when resetAfter is 0", async () => {
			const { getByTestId } = render(Harness, { props: { state: "error", resetAfter: 0 } });
			await vi.advanceTimersByTimeAsync(60_000);
			expect(getByTestId("bound-state").textContent).toBe("error");
		});

		it("cancels the stale timer when state changes again before it fires (race guard)", async () => {
			const { getByTestId, rerender } = render(Harness, {
				props: { state: "success", resetAfter: 1800 },
			});

			await vi.advanceTimersByTimeAsync(500);
			await rerender({ state: "error", resetAfter: 1800 });

			// If the original success→idle timer had survived, it would fire here
			// (500 + 1300 = 1800ms after the first transition).
			await vi.advanceTimersByTimeAsync(1300);
			expect(getByTestId("bound-state").textContent).toBe("error");

			// Only the fresh error→idle timer, started at the second transition,
			// actually fires — 1800ms after THAT change.
			await vi.advanceTimersByTimeAsync(500);
			expect(getByTestId("bound-state").textContent).toBe("idle");
		});

		it("cancels the pending timer and removes the portalled live region on unmount", async () => {
			const { unmount } = render(Harness, { props: { state: "success" } });
			expect(vi.getTimerCount()).toBeGreaterThan(0);
			expect(document.body.querySelector('[role="status"]')).not.toBeNull();

			unmount();
			// Asserted BEFORE the afterEach sweep runs (it removes any leftover
			// `[role="status"]` node from document.body) — otherwise the sweep
			// would mask a portal-teardown regression completely, and this
			// suite would stay green while every StatusMorph leaked a live
			// region into document.body for the page's lifetime.
			expect(vi.getTimerCount()).toBe(0);
			expect(document.body.querySelector('[role="status"]')).toBeNull();
		});

		it("honours an external write to idle even mid-loading, with no rejection guard", async () => {
			const { getByTestId, rerender } = render(Harness, { props: { state: "loading" } });
			expect(getByTestId("bound-state").textContent).toBe("loading");

			await rerender({ state: "idle" });
			expect(getByTestId("bound-state").textContent).toBe("idle");
		});
	});

	describe("portal + accessible name isolation", () => {
		it("moves the live region to document.body, not inside the host button", async () => {
			render(Harness, { props: { state: "loading" } });
			const live = liveRegion();
			expect(live.parentElement).toBe(document.body);

			const button = screen.getByRole("button");
			expect(live.contains(button)).toBe(false);
			expect(button.contains(live)).toBe(false);
		});

		it("does not let the live region's text bleed into the host button's accessible name", () => {
			render(Harness, { props: { state: "loading" } });
			// If the live region were rendered inside the button instead of
			// portalled out, its "Loading" text would be concatenated into the
			// name and this lookup would fail.
			expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
		});
	});

	describe("haptics", () => {
		it("vibrates with the success pattern on entering success when haptic is true", async () => {
			const { rerender } = render(StatusMorph, { props: { state: "idle", haptic: true } });
			await rerender({ state: "success", haptic: true });
			expect(vibrateMock).toHaveBeenCalledWith("success");
		});

		it("vibrates with the error pattern on entering error when haptic is true", async () => {
			const { rerender } = render(StatusMorph, { props: { state: "idle", haptic: true } });
			await rerender({ state: "error", haptic: true });
			expect(vibrateMock).toHaveBeenCalledWith("error");
		});

		it("never vibrates for loading or idle", async () => {
			const { rerender } = render(StatusMorph, { props: { state: "idle", haptic: true } });
			await rerender({ state: "loading", haptic: true });
			expect(vibrateMock).not.toHaveBeenCalled();
		});

		it("stays silent when haptic is false (the default), even entering success", async () => {
			const { rerender } = render(StatusMorph, { props: { state: "idle" } });
			await rerender({ state: "success" });
			expect(vibrateMock).not.toHaveBeenCalled();
		});

		it("does not re-fire when haptic is toggled on while already sitting in success", async () => {
			const { rerender } = render(StatusMorph, {
				props: { state: "success", haptic: false },
			});
			vibrateMock.mockClear();
			await rerender({ state: "success", haptic: true });
			expect(vibrateMock).not.toHaveBeenCalled();
		});
	});

	// Every transition/keyframe StatusMorph declares lives inside
	// `@media (prefers-reduced-motion: no-preference)` — the resting values
	// used outside it (opacity, stroke-dasharray, stroke-dashoffset) are
	// already the correct final glyph per state, so there is no JS branch to
	// exercise. This documents the DOM/attribute contract holds regardless of
	// the preference, matching the project's own testing boundary (jsdom
	// cannot assert "the check doesn't animate," only what drives the CSS
	// that does).
	it("reduced motion: state still drives the correct final data-state/live-text contract", () => {
		stubMatchMedia(true);
		try {
			const { container, rerender } = render(StatusMorph, { props: { state: "loading" } });
			expect(root(container)).toHaveAttribute("data-state", "loading");

			rerender({ state: "success" });
			expect(root(container)).toHaveAttribute("data-state", "success");
			expect(liveRegion().textContent).toBe("Done");
		} finally {
			stubMatchMedia(false);
		}
	});

	it("merges the class prop with the base classes", () => {
		const { container } = render(StatusMorph, { props: { class: "my-status" } });
		expect(root(container).className).toContain("my-status");
		expect(root(container).className).toContain("ft-statusmorph");
	});
});
