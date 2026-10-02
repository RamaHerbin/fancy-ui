import { cleanup, render } from "@testing-library/vue";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import Presence from "./Presence.vue";

/**
 * Transposed assertion-for-assertion from the source component's suite. Two
 * shapes changed and nothing else did:
 *
 * - The source's `PresenceHarness.test.svelte` rig is gone: the exposed `ref`
 *   is read straight off the instance (`wrapper.vm.ref`), which is what the
 *   harness existed to approximate through a sibling marker node.
 * - The source drove `data-state` / `inert` by hand-dispatching its own
 *   framework's `introstart`/`introend`/`outrostart`/`outroend` transition
 *   events, which have no counterpart here. The same four assertions are made
 *   against the real mechanism instead — `usePresence` plus the
 *   `Element.prototype.animate` stub in `test-setup.ts` — which is strictly
 *   more of the production path, not less.
 *
 * No `inert` shim, deliberately (the internals suite makes the same call).
 * jsdom implements no `inert` IDL property, so a prototype getter/setter
 * reflecting the property to the attribute would mean these cases pass against
 * the shim rather than against what the component writes. The clock writes the
 * ATTRIBUTE through `toggleAttribute`, so `hasAttribute("inert")` observes
 * production behaviour directly and a shim would only hide the next regression.
 */

/** Same shape as the source suite's stub — fixed per test, no live change
 * event needed here. */
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
 * a settled leg is two turns away; crossing a macrotask boundary drains the
 * whole chain, and the trailing `nextTick()` flushes the render the finish
 * scheduled.
 */
const settleLegs = async () => {
	await new Promise<void>((resolve) => setTimeout(resolve, 0));
	await nextTick();
};

const SLOTS = { default: "<p>panel content</p>" };

const panelIn = (container: Element) => container.querySelector<HTMLElement>(".ft-presence");

describe("Presence", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	describe("reduced motion (duration collapses to 0 — no Element.prototype.animate dependency)", () => {
		it("open=true renders synchronously with data-state=open, ref non-null", () => {
			stubMatchMedia(true);
			const wrapper = mount(Presence, { props: { open: true }, slots: SLOTS });
			const panel = wrapper.find(".ft-presence");
			expect(panel.exists()).toBe(true);
			expect(panel.attributes("data-state")).toBe("open");
			expect(wrapper.vm.ref).not.toBeNull();
			wrapper.unmount();
		});

		it("open=false renders nothing at all", () => {
			stubMatchMedia(true);
			const { container } = render(Presence, { props: { open: false }, slots: SLOTS });
			expect(panelIn(container)).toBeNull();
		});

		it("toggling open synchronously mounts then unmounts, firing onEnterEnd then onExitEnd in order", async () => {
			stubMatchMedia(true);
			const calls: string[] = [];
			const onEnterEnd = vi.fn(() => calls.push("enter"));
			const onExitEnd = vi.fn(() => calls.push("exit"));
			const { container, rerender } = render(Presence, {
				props: { open: false, onEnterEnd, onExitEnd },
				slots: SLOTS,
			});

			// A zero-duration leg lands inside the same flush that started it,
			// before paint — no `settleLegs()` anywhere in this test.
			await rerender({ open: true });
			expect(panelIn(container)?.getAttribute("data-state")).toBe("open");
			expect(onEnterEnd).toHaveBeenCalledTimes(1);

			await rerender({ open: false });
			expect(panelIn(container)).toBeNull();
			expect(onExitEnd).toHaveBeenCalledTimes(1);
			expect(calls).toEqual(["enter", "exit"]);
		});

		it("rapid open toggles do not throw and settle at the final state", async () => {
			stubMatchMedia(true);
			const { container, rerender } = render(Presence, {
				props: { open: false },
				slots: SLOTS,
			});

			// No wrapper assertion here on purpose: `.not.toThrow()` around an
			// async callback only ever inspects a SYNCHRONOUS throw, so it would
			// pass unconditionally regardless of what happens inside. Letting a
			// rejection propagate out of the `it` body is what actually fails
			// this test if one of these throws.
			await rerender({ open: true });
			await rerender({ open: false });
			await rerender({ open: true });
			await rerender({ open: false });

			expect(panelIn(container)).toBeNull();
		});
	});

	describe("transition lifecycle wiring (driven through the real sampler, which is what replaces the source's hand-dispatched events)", () => {
		it("the entrance flips data-state to opening, then settles it back to open and fires onEnterEnd", async () => {
			stubMatchMedia(false);
			const onEnterEnd = vi.fn();
			const { container, rerender } = render(Presence, {
				props: { open: false, onEnterEnd },
				slots: SLOTS,
			});

			await rerender({ open: true });
			const panel = panelIn(container) as HTMLElement;
			// The post-flush driver has already run by the time `rerender`
			// resolves, and the stub's finish is still a turn away.
			expect(panel.dataset.state).toBe("opening");

			await settleLegs();
			expect(panel.dataset.state).toBe("open");
			expect(onEnterEnd).toHaveBeenCalledTimes(1);
		});

		it("the exit flips data-state to closing and applies inert by default", async () => {
			stubMatchMedia(false);
			const { container, rerender } = render(Presence, {
				props: { open: false },
				slots: SLOTS,
			});

			await rerender({ open: true });
			await settleLegs();
			const panel = panelIn(container) as HTMLElement;
			expect(panel.hasAttribute("inert")).toBe(false);

			await rerender({ open: false });

			expect(panel.dataset.state).toBe("closing");
			expect(panel.hasAttribute("inert")).toBe(true);
			await settleLegs();
		});

		it("inert={false}: the exit never touches inert at all", async () => {
			stubMatchMedia(false);
			const { container, rerender } = render(Presence, {
				props: { open: false, inert: false },
				slots: SLOTS,
			});

			await rerender({ open: true });
			await settleLegs();
			const panel = panelIn(container) as HTMLElement;

			await rerender({ open: false });

			expect(panel.hasAttribute("inert")).toBe(false);
			await settleLegs();
		});

		it("the settled exit fires onExitEnd", async () => {
			stubMatchMedia(false);
			const onExitEnd = vi.fn();
			const { rerender } = render(Presence, {
				props: { open: false, onExitEnd },
				slots: SLOTS,
			});

			await rerender({ open: true });
			await settleLegs();
			await rerender({ open: false });
			await settleLegs();

			expect(onExitEnd).toHaveBeenCalledTimes(1);
		});
	});

	describe("full-motion — WAAPI stub path (non-zero duration, driven by src/test-setup.ts)", () => {
		it("mounts through the intro and unmounts through the outro end to end", async () => {
			stubMatchMedia(false);
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const { container, rerender } = render(Presence, {
				props: { open: false },
				slots: SLOTS,
			});
			expect(panelIn(container)).toBeNull();

			await rerender({ open: true });
			await settleLegs();
			expect(panelIn(container)).not.toBeNull();

			await rerender({ open: false });
			await settleLegs();
			expect(panelIn(container)).toBeNull();

			// Reaching here at all already proves the WAAPI stub was exercised
			// (without it, the first non-zero-duration animate() call throws
			// synchronously) — this confirms it was the actual mechanism.
			expect(animateSpy).toHaveBeenCalled();
		});

		it("rapid open toggles do not throw under the real WAAPI stub either, and settle at the final state", async () => {
			stubMatchMedia(false);
			const { container, rerender } = render(Presence, {
				props: { open: false },
				slots: SLOTS,
			});

			await rerender({ open: true });
			await rerender({ open: false });
			await rerender({ open: true });
			await rerender({ open: false });

			await settleLegs();
			expect(panelIn(container)).toBeNull();
		});
	});

	it("a LOCAL transition never plays on its own block's initial render: data-state is 'open' immediately and onEnterEnd never fires", async () => {
		stubMatchMedia(false);
		const onEnterEnd = vi.fn();
		const { container } = render(Presence, {
			props: { open: true, onEnterEnd },
			slots: SLOTS,
		});
		expect(panelIn(container)?.getAttribute("data-state")).toBe("open");

		// Give any stray microtask a turn — if an intro HAD played, onEnterEnd
		// would already be scheduled by now.
		await settleLegs();
		expect(onEnterEnd).not.toHaveBeenCalled();
	});

	it("merges a custom class with the base ft-presence class", () => {
		stubMatchMedia(false);
		const { container } = render(Presence, {
			props: { open: true, class: "my-panel" },
			slots: SLOTS,
		});
		const panel = panelIn(container) as HTMLElement;
		expect(panel.classList.contains("ft-presence")).toBe(true);
		expect(panel.classList.contains("my-panel")).toBe(true);
	});

	it("cleanup: unmounting removes the reduced-motion matchMedia listener", () => {
		const { removeEventListener } = stubMatchMediaSpy(false);
		const { unmount } = render(Presence, { props: { open: true }, slots: SLOTS });

		unmount();

		expect(removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
	});

	it("ref is null while closed, non-null while open, and null again once a real close finishes", async () => {
		stubMatchMedia(true); // reduced motion: synchronous, no WAAPI timing to race
		const wrapper = mount(Presence, { props: { open: false }, slots: SLOTS });

		expect(wrapper.vm.ref).toBeNull();

		await wrapper.setProps({ open: true });
		expect(wrapper.vm.ref).not.toBeNull();

		await wrapper.setProps({ open: false });
		expect(wrapper.vm.ref).toBeNull();

		wrapper.unmount();
	});
});
