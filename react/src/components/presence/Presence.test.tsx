import { act, render } from "@testing-library/react";
import { createRef, StrictMode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Presence } from "./Presence.js";

/**
 * Transposed assertion-for-assertion from the source component's suite. Two
 * shapes changed and nothing else did:
 *
 * - The source's `PresenceHarness.test.svelte` rig is declared inline as
 *   `<RefProbe>`: it existed only because a component in that framework must
 *   live in its own file.
 * - The source drove `data-state` / `inert` by hand-dispatching the
 *   framework's own `introstart`/`introend`/`outrostart`/`outroend` transition
 *   events, which have no counterpart here. The same four assertions are made
 *   against the real mechanism instead — `usePresence` plus the
 *   `Element.prototype.animate` stub in `test-setup.ts` — which is strictly
 *   more of the production path, not less.
 */

/**
 * jsdom (verified: `"inert" in HTMLElement.prototype === false` in this repo's
 * pinned version) has no `inert` IDL property at all — setting `el.inert = true`
 * creates a plain expando with no attribute reflection, so a test that only
 * reads `el.inert` back can pass even if the real browser behaviour (an `inert`
 * ATTRIBUTE, which is what `:not([inert])` selectors and assistive tech key on)
 * was never touched. This shim makes the property reflect to the attribute,
 * matching every real browser, so a test reading `hasAttribute("inert")`
 * observes the same thing production code produces. Guarded so it is a no-op
 * the moment jsdom ships the real property.
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

/** Fixed per test, no live change event needed here. */
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

/** Spy-capable variant — only the cleanup test needs to see
 *  `removeEventListener` calls. */
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

/**
 * Drains a leg to completion. The `animate` stub finishes each animation on a
 * MICROTASK and the sampler chains a leading dummy into the real animation, so
 * a settled leg is two turns away; `act` crosses a macrotask boundary (draining
 * both) and flushes the React updates the finish schedules.
 */
const settleLegs = () => act(async () => {});

const CHILD = <p>panel content</p>;

const panelIn = (container: HTMLElement) => container.querySelector<HTMLElement>(".ft-presence");

describe("Presence", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("reduced motion (duration collapses to 0 — no Element.prototype.animate dependency)", () => {
		it("open=true renders synchronously with data-state=open, ref non-null", () => {
			stubMatchMedia(true);
			const ref = createRef<HTMLDivElement>();
			const { container } = render(
				<Presence open ref={ref}>
					{CHILD}
				</Presence>
			);
			const panel = panelIn(container);
			expect(panel).not.toBeNull();
			expect(panel?.getAttribute("data-state")).toBe("open");
			expect(ref.current).not.toBeNull();
		});

		it("open=false renders nothing at all", () => {
			stubMatchMedia(true);
			const { container } = render(<Presence open={false}>{CHILD}</Presence>);
			expect(panelIn(container)).toBeNull();
		});

		it("toggling open synchronously mounts then unmounts, firing onEnterEnd then onExitEnd in order", () => {
			stubMatchMedia(true);
			const calls: string[] = [];
			const onEnterEnd = vi.fn(() => calls.push("enter"));
			const onExitEnd = vi.fn(() => calls.push("exit"));
			const { container, rerender } = render(
				<Presence open={false} onEnterEnd={onEnterEnd} onExitEnd={onExitEnd}>
					{CHILD}
				</Presence>
			);

			// No await anywhere: a zero-duration leg lands inside the same layout
			// effect that started it, before paint.
			rerender(
				<Presence open onEnterEnd={onEnterEnd} onExitEnd={onExitEnd}>
					{CHILD}
				</Presence>
			);
			expect(panelIn(container)?.getAttribute("data-state")).toBe("open");
			expect(onEnterEnd).toHaveBeenCalledTimes(1);

			rerender(
				<Presence open={false} onEnterEnd={onEnterEnd} onExitEnd={onExitEnd}>
					{CHILD}
				</Presence>
			);
			expect(panelIn(container)).toBeNull();
			expect(onExitEnd).toHaveBeenCalledTimes(1);
			expect(calls).toEqual(["enter", "exit"]);
		});

		it("rapid open toggles do not throw and settle at the final state", () => {
			stubMatchMedia(true);
			const { container, rerender } = render(<Presence open={false}>{CHILD}</Presence>);

			rerender(<Presence open>{CHILD}</Presence>);
			rerender(<Presence open={false}>{CHILD}</Presence>);
			rerender(<Presence open>{CHILD}</Presence>);
			rerender(<Presence open={false}>{CHILD}</Presence>);

			expect(panelIn(container)).toBeNull();
		});
	});

	describe("transition lifecycle wiring (driven through the real sampler, which is what replaces the source's hand-dispatched events)", () => {
		it("the entrance flips data-state to opening, then settles it back to open and fires onEnterEnd", async () => {
			stubMatchMedia(false);
			const onEnterEnd = vi.fn();
			const { container, rerender } = render(
				<Presence open={false} onEnterEnd={onEnterEnd}>
					{CHILD}
				</Presence>
			);

			rerender(<Presence open onEnterEnd={onEnterEnd}>{CHILD}</Presence>);
			const panel = panelIn(container) as HTMLElement;
			// The layout effect has already run by the time `rerender` returns,
			// and the stub's finish is still a microtask away.
			expect(panel.dataset.state).toBe("opening");

			await settleLegs();
			expect(panel.dataset.state).toBe("open");
			expect(onEnterEnd).toHaveBeenCalledTimes(1);
		});

		it("the exit flips data-state to closing and applies inert by default", async () => {
			stubMatchMedia(false);
			const { container, rerender } = render(<Presence open={false}>{CHILD}</Presence>);

			rerender(<Presence open>{CHILD}</Presence>);
			await settleLegs();
			const panel = panelIn(container) as HTMLElement;
			expect(panel.inert).toBe(false);

			rerender(<Presence open={false}>{CHILD}</Presence>);

			expect(panel.dataset.state).toBe("closing");
			expect(panel.inert).toBe(true);
			await settleLegs();
		});

		it("inert={false}: the exit never touches inert at all", async () => {
			stubMatchMedia(false);
			const { container, rerender } = render(
				<Presence open={false} inert={false}>
					{CHILD}
				</Presence>
			);

			rerender(
				<Presence open inert={false}>
					{CHILD}
				</Presence>
			);
			await settleLegs();
			const panel = panelIn(container) as HTMLElement;

			rerender(
				<Presence open={false} inert={false}>
					{CHILD}
				</Presence>
			);

			expect(panel.inert).toBe(false);
			await settleLegs();
		});

		it("the settled exit fires onExitEnd", async () => {
			stubMatchMedia(false);
			const onExitEnd = vi.fn();
			const { rerender } = render(
				<Presence open={false} onExitEnd={onExitEnd}>
					{CHILD}
				</Presence>
			);

			rerender(<Presence open onExitEnd={onExitEnd}>{CHILD}</Presence>);
			await settleLegs();
			rerender(
				<Presence open={false} onExitEnd={onExitEnd}>
					{CHILD}
				</Presence>
			);
			await settleLegs();

			expect(onExitEnd).toHaveBeenCalledTimes(1);
		});
	});

	describe("full-motion — WAAPI stub path (non-zero duration, driven by src/test-setup.ts)", () => {
		it("mounts through the intro and unmounts through the outro end to end", async () => {
			stubMatchMedia(false);
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const { container, rerender } = render(<Presence open={false}>{CHILD}</Presence>);
			expect(panelIn(container)).toBeNull();

			rerender(<Presence open>{CHILD}</Presence>);
			await settleLegs();
			expect(panelIn(container)).not.toBeNull();

			rerender(<Presence open={false}>{CHILD}</Presence>);
			await settleLegs();
			expect(panelIn(container)).toBeNull();

			// Reaching here at all already proves the WAAPI stub was exercised
			// (without it, the first non-zero-duration animate() call throws
			// synchronously) — this confirms it was the actual mechanism.
			expect(animateSpy).toHaveBeenCalled();
		});

		it("rapid open toggles do not throw under the real WAAPI stub either, and settle at the final state", async () => {
			stubMatchMedia(false);
			const { container, rerender } = render(<Presence open={false}>{CHILD}</Presence>);

			rerender(<Presence open>{CHILD}</Presence>);
			rerender(<Presence open={false}>{CHILD}</Presence>);
			rerender(<Presence open>{CHILD}</Presence>);
			rerender(<Presence open={false}>{CHILD}</Presence>);

			await settleLegs();
			expect(panelIn(container)).toBeNull();
		});
	});

	describe("StrictMode (React's dev double-invoke — every consumer running a dev build)", () => {
		it("plays the entrance to completion, so [data-state='open'] applies and onEnterEnd fires", async () => {
			stubMatchMedia(false);
			const onEnterEnd = vi.fn();
			const { container, rerender } = render(
				<StrictMode>
					<Presence open={false} onEnterEnd={onEnterEnd}>
						{CHILD}
					</Presence>
				</StrictMode>
			);

			rerender(
				<StrictMode>
					<Presence open onEnterEnd={onEnterEnd}>
						{CHILD}
					</Presence>
				</StrictMode>
			);
			// React 19 double-invokes a host node's ref on mount — attach, detach,
			// attach — with the detach landing after the layout effect that started
			// the leg. The panel must still reach its resting state rather than
			// pinning at "opening" for the life of the surface.
			expect(panelIn(container)?.getAttribute("data-state")).toBe("opening");

			await settleLegs();
			expect(panelIn(container)?.getAttribute("data-state")).toBe("open");
			expect(onEnterEnd).toHaveBeenCalledTimes(1);
		});

		it("runs a full open → close → open cycle, entrance settling on BOTH opens", async () => {
			stubMatchMedia(false);
			const onEnterEnd = vi.fn();
			const onExitEnd = vi.fn();
			const surface = (open: boolean) => (
				<StrictMode>
					<Presence open={open} onEnterEnd={onEnterEnd} onExitEnd={onExitEnd}>
						{CHILD}
					</Presence>
				</StrictMode>
			);
			const { container, rerender } = render(surface(false));

			rerender(surface(true));
			await settleLegs();
			expect(panelIn(container)?.getAttribute("data-state")).toBe("open");

			rerender(surface(false));
			await settleLegs();
			expect(panelIn(container)).toBeNull();

			// The panel is created afresh here, so its ref is double-invoked again:
			// the hazard is per-open, not first-mount-only.
			rerender(surface(true));
			await settleLegs();
			expect(panelIn(container)?.getAttribute("data-state")).toBe("open");
			expect(onEnterEnd).toHaveBeenCalledTimes(2);
			expect(onExitEnd).toHaveBeenCalledTimes(1);
		});
	});

	it("a LOCAL transition never plays on its own block's initial render: data-state is 'open' immediately and onEnterEnd never fires", async () => {
		stubMatchMedia(false);
		const onEnterEnd = vi.fn();
		const { container } = render(
			<Presence open onEnterEnd={onEnterEnd}>
				{CHILD}
			</Presence>
		);
		expect(panelIn(container)?.getAttribute("data-state")).toBe("open");

		// Give any stray microtask a turn — if an intro HAD played, onEnterEnd
		// would already be scheduled by now.
		await settleLegs();
		expect(onEnterEnd).not.toHaveBeenCalled();
	});

	it("merges a custom class with the base ft-presence class", () => {
		stubMatchMedia(false);
		const { container } = render(
			<Presence open className="my-panel">
				{CHILD}
			</Presence>
		);
		const panel = panelIn(container) as HTMLElement;
		expect(panel.classList.contains("my-panel")).toBe(true);
	});

	it("cleanup: unmounting removes the reduced-motion matchMedia listener", () => {
		const { removeEventListener } = stubMatchMediaSpy(false);
		const { unmount } = render(<Presence open>{CHILD}</Presence>);

		unmount();

		expect(removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
	});

	it("ref is null while closed, non-null while open, and null again once a real close finishes", () => {
		stubMatchMedia(true); // reduced motion: synchronous, no WAAPI timing to race

		/**
		 * The inline replacement for the source's `PresenceHarness.test.svelte`:
		 * it publishes the forwarded ref's null/non-null-ness as a data attribute
		 * on a sibling marker node. `setRefValue` is passed directly BECAUSE its
		 * identity is stable — an inline arrow would change the composed ref's
		 * identity on every render and make React detach and reattach the node.
		 */
		function RefProbe({ open }: { open: boolean }) {
			const [refValue, setRefValue] = useState<HTMLDivElement | null>(null);
			return (
				<>
					<div data-testid="ref-probe" data-ref-null={refValue === null ? "true" : "false"} />
					<Presence ref={setRefValue} open={open}>
						{CHILD}
					</Presence>
				</>
			);
		}

		const { container, rerender } = render(<RefProbe open={false} />);
		const probe = () => container.querySelector('[data-testid="ref-probe"]');

		expect(probe()?.getAttribute("data-ref-null")).toBe("true");

		rerender(<RefProbe open />);
		expect(probe()?.getAttribute("data-ref-null")).toBe("false");

		rerender(<RefProbe open={false} />);
		expect(probe()?.getAttribute("data-ref-null")).toBe("true");
	});
});
