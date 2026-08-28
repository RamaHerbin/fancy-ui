import { render, cleanup } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import Presence from "./Presence.svelte";
import PresenceHarness from "./PresenceHarness.test.svelte";

/**
 * jsdom (verified: 'inert' in HTMLElement.prototype === false in this
 * repo's pinned version) has no `inert` IDL property at all — setting
 * `el.inert = true` creates a plain expando with no attribute reflection, so
 * a test that only reads `el.inert` back can pass even if the real browser
 * behaviour (an `inert` ATTRIBUTE, which is what `prefers-reduced-motion`
 * consumers, `:not([inert])` selectors, and AT actually key on) was never
 * touched. This shim makes the property reflect to the attribute, matching
 * every real browser, so a test reading `hasAttribute("inert")` observes
 * the same thing production code produces. Guarded so it's a no-op the
 * moment jsdom ships the real property.
 */
if (!("inert" in HTMLElement.prototype)) {
	Object.defineProperty(HTMLElement.prototype, "inert", {
		configurable: true,
		get(this: HTMLElement) {
			return this.hasAttribute("inert");
		},
		set(this: HTMLElement, value: boolean) {
			if (value) this.setAttribute("inert", "");
			else this.removeAttribute("inert");
		},
	});
}

/** Same shape as `magnetic/Magnetic.test.ts`'s stub — fixed per test, no
 * live change event needed here. */
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

/** Spy-capable variant — `_internals/motion/media-query.test.ts`'s own
 * shape — only the cleanup test needs to see `removeEventListener` calls. */
function stubMatchMediaSpy(matches: boolean) {
	const addEventListener = vi.fn();
	const removeEventListener = vi.fn();
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		configurable: true,
		value: (query: string) => ({
			matches,
			media: query,
			onchange: null,
			addEventListener,
			removeEventListener,
			dispatchEvent: () => false,
			addListener: () => {},
			removeListener: () => {},
		}),
	});
	return { addEventListener, removeEventListener };
}

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

const CHILD = () => snippet("<p>panel content</p>");

describe("Presence", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	describe("reduced motion (duration collapses to 0 — no Element.prototype.animate dependency)", () => {
		it("open=true renders synchronously with data-state=open, ref non-null", () => {
			stubMatchMedia(true);
			const { container } = render(Presence, { props: { open: true, children: CHILD() } });
			const panel = container.querySelector(".ft-presence");
			expect(panel).not.toBeNull();
			expect(panel?.getAttribute("data-state")).toBe("open");
		});

		it("open=false renders nothing at all", () => {
			stubMatchMedia(true);
			const { container } = render(Presence, { props: { open: false, children: CHILD() } });
			expect(container.querySelector(".ft-presence")).toBeNull();
		});

		it("toggling open synchronously mounts then unmounts, firing onEnterEnd then onExitEnd in order", async () => {
			stubMatchMedia(true);
			const calls: string[] = [];
			const onEnterEnd = vi.fn(() => calls.push("enter"));
			const onExitEnd = vi.fn(() => calls.push("exit"));
			const { container, rerender } = render(Presence, {
				props: { open: false, children: CHILD(), onEnterEnd, onExitEnd },
			});

			await rerender({ open: true, children: CHILD(), onEnterEnd, onExitEnd });
			expect(container.querySelector(".ft-presence")?.getAttribute("data-state")).toBe("open");
			expect(onEnterEnd).toHaveBeenCalledTimes(1);

			await rerender({ open: false, children: CHILD(), onEnterEnd, onExitEnd });
			expect(container.querySelector(".ft-presence")).toBeNull();
			expect(onExitEnd).toHaveBeenCalledTimes(1);
			expect(calls).toEqual(["enter", "exit"]);
		});

		it("rapid open toggles do not throw and settle at the final state", async () => {
			stubMatchMedia(true);
			const { container, rerender } = render(Presence, {
				props: { open: false, children: CHILD() },
			});

			// No wrapper assertion here on purpose: `.not.toThrow()` around an
			// async callback only ever inspects a SYNCHRONOUS throw, so it would
			// pass unconditionally regardless of what happens inside. Letting a
			// rejection propagate out of the `it` body is what actually fails
			// this test if one of these throws.
			await rerender({ open: true, children: CHILD() });
			await rerender({ open: false, children: CHILD() });
			await rerender({ open: true, children: CHILD() });
			await rerender({ open: false, children: CHILD() });

			expect(container.querySelector(".ft-presence")).toBeNull();
		});
	});

	describe("lifecycle event wiring (dispatched directly — deterministic, independent of the real WAAPI timing)", () => {
		it("onintrostart flips data-state to opening; onintroend settles it back to open and fires onEnterEnd", async () => {
			stubMatchMedia(false);
			const onEnterEnd = vi.fn();
			const { container } = render(Presence, {
				props: { open: true, children: CHILD(), onEnterEnd },
			});
			const panel = container.querySelector(".ft-presence") as HTMLElement;
			// Starting value: "open", not "opening" — see the component's own
			// comment on why (Svelte skips the intro on hydration by default).
			expect(panel.dataset.state).toBe("open");

			panel.dispatchEvent(new CustomEvent("introstart"));
			// The `state` write is a $state update, which flushes to the DOM on
			// a microtask, not synchronously inside the dispatchEvent call —
			// same reason the WAAPI stub tests below need waitFor.
			await tick();
			expect(panel.dataset.state).toBe("opening");

			panel.dispatchEvent(new CustomEvent("introend"));
			await tick();
			expect(panel.dataset.state).toBe("open");
			expect(onEnterEnd).toHaveBeenCalledTimes(1);
		});

		it("onoutrostart flips data-state to closing and leaves Svelte's own inert=true in place by default", async () => {
			stubMatchMedia(false);
			const { container } = render(Presence, { props: { open: true, children: CHILD() } });
			const panel = container.querySelector(".ft-presence") as HTMLElement;
			// Mimics what Svelte's real transition engine does synchronously,
			// immediately before dispatching this very event (verified against
			// node_modules/svelte's transitions.js) — the component's own
			// `inert` default (`true`) is exactly that native behavior, so
			// there is nothing for the handler to do except leave it alone.
			panel.inert = true;

			panel.dispatchEvent(new CustomEvent("outrostart"));
			// See the introstart test above: the `state` write only reaches the
			// DOM after a microtask flush.
			await tick();

			expect(panel.dataset.state).toBe("closing");
			expect(panel.inert).toBe(true);
		});

		it("inert={false}: onoutrostart overrides Svelte's inert=true back to false", () => {
			stubMatchMedia(false);
			const { container } = render(Presence, {
				props: { open: true, children: CHILD(), inert: false },
			});
			const panel = container.querySelector(".ft-presence") as HTMLElement;
			panel.inert = true; // Svelte's own pre-dispatch assignment

			panel.dispatchEvent(new CustomEvent("outrostart"));

			expect(panel.inert).toBe(false);
		});

		it("onoutroend fires onExitEnd", () => {
			stubMatchMedia(false);
			const onExitEnd = vi.fn();
			const { container } = render(Presence, {
				props: { open: true, children: CHILD(), onExitEnd },
			});
			const panel = container.querySelector(".ft-presence") as HTMLElement;

			panel.dispatchEvent(new CustomEvent("outroend"));

			expect(onExitEnd).toHaveBeenCalledTimes(1);
		});
	});

	describe("full-motion — WAAPI stub path (non-zero duration, driven by src/test-setup.ts)", () => {
		it("mounts through the intro and unmounts through the outro end to end", async () => {
			stubMatchMedia(false);
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const { container, rerender } = render(Presence, {
				props: { open: false, children: CHILD() },
			});
			expect(container.querySelector(".ft-presence")).toBeNull();

			await rerender({ open: true, children: CHILD() });
			await vi.waitFor(() => {
				expect(container.querySelector(".ft-presence")).not.toBeNull();
			});

			await rerender({ open: false, children: CHILD() });
			await vi.waitFor(() => {
				expect(container.querySelector(".ft-presence")).toBeNull();
			});

			// Reaching here at all already proves the WAAPI stub was exercised
			// (without it, the first non-zero-duration animate() call throws
			// synchronously) — this confirms it was the actual mechanism. The
			// data-state="closing" / inert wiring itself is covered above, via
			// hand-dispatched transition events — this repo's `animate()` stub
			// (src/test-setup.ts) finishes on a microtask, faster than any
			// `waitFor` poll or an un-awaited `rerender()` call can reliably
			// observe the mid-outro DOM state, so asserting on it here would be
			// asserting on a race rather than the guarantee.
			expect(animateSpy).toHaveBeenCalled();
		});

		it("rapid open toggles do not throw under the real WAAPI stub either, and settle at the final state", async () => {
			stubMatchMedia(false);
			const { container, rerender } = render(Presence, {
				props: { open: false, children: CHILD() },
			});

			await rerender({ open: true, children: CHILD() });
			await rerender({ open: false, children: CHILD() });
			await rerender({ open: true, children: CHILD() });
			await rerender({ open: false, children: CHILD() });

			await vi.waitFor(() => {
				expect(container.querySelector(".ft-presence")).toBeNull();
			});
		});
	});

	it("a LOCAL transition never plays on its own block's initial render: data-state is 'open' immediately and onEnterEnd never fires", async () => {
		// `intro` belongs on the mount-options level, alongside `props` — NOT
		// as a third argument to `render()` (that argument is
		// `RenderOptions`/setup options, e.g. `baseElement`/`queries`, and
		// silently ignores anything else, so a previous version of this test
		// asserting via a third-argument `{ intro: false }` passed for a
		// reason unrelated to what it claimed: Svelte's own default of
		// `intro: true` never even got overridden — the assertion held
		// because a LOCAL `transition:` (no `|global`) never plays on its
		// own block's initial render regardless, not because of this option.
		stubMatchMedia(false);
		const onEnterEnd = vi.fn();
		const { container } = render(Presence, {
			props: { open: true, children: CHILD(), onEnterEnd },
			intro: false,
		});
		const panel = container.querySelector(".ft-presence");
		expect(panel?.getAttribute("data-state")).toBe("open");

		// Give any stray microtask a turn — if an intro HAD played, onEnterEnd
		// would already be scheduled by now.
		await tick();
		expect(onEnterEnd).not.toHaveBeenCalled();
	});

	it("merges a custom class with the base ft-presence class", () => {
		stubMatchMedia(false);
		const { container } = render(Presence, {
			props: { open: true, children: CHILD(), class: "my-panel" },
		});
		const panel = container.querySelector(".ft-presence") as HTMLElement;
		expect(panel.classList.contains("my-panel")).toBe(true);
	});

	it("cleanup: unmounting removes the reduced-motion matchMedia listener", () => {
		const { removeEventListener } = stubMatchMediaSpy(false);
		const { unmount } = render(Presence, { props: { open: true, children: CHILD() } });

		unmount();

		expect(removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
	});

	it("ref is null while closed, non-null while open, and null again once a real close finishes", async () => {
		stubMatchMedia(true); // reduced motion: synchronous, no WAAPI timing to race
		const { container, rerender } = render(PresenceHarness, { props: { open: false } });
		const probe = () => container.querySelector('[data-testid="ref-probe"]');

		expect(probe()?.getAttribute("data-ref-null")).toBe("true");

		await rerender({ open: true });
		expect(probe()?.getAttribute("data-ref-null")).toBe("false");

		await rerender({ open: false });
		expect(probe()?.getAttribute("data-ref-null")).toBe("true");
	});
});
