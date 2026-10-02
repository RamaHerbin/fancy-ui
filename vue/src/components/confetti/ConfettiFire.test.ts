import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import type { Options as ConfettiOptions } from "canvas-confetti";

// Same mocking shape as Confetti.test.ts: the default export is callable and
// carries `.create`, which hands back the per-canvas instance.
const instance = vi.fn() as ReturnType<typeof vi.fn> & { reset: ReturnType<typeof vi.fn> };
instance.reset = vi.fn();

vi.mock("canvas-confetti", () => {
	const globalFire = vi.fn() as ReturnType<typeof vi.fn> & { create: () => unknown };
	globalFire.create = () => instance;
	return { default: globalFire };
});

import Confetti from "./Confetti.vue";

// The module above is mocked, but the CANVAS is not: the shared setup stubs
// `getContext` to `null`, and `Confetti.vue` probes it before creating the
// engine so a contextless surface stays inert instead of throwing on unmount.
// These cases are about `fire()`, so they need the paintable branch — this is
// the same component-level stub `MosaicGlow.test.ts` installs. The object is
// never read: only its truthiness reaches the probe.
const originalGetContext = HTMLCanvasElement.prototype.getContext;

/**
 * Harness for the freshness cases: holds the `options` prop, hands the child's
 * exposed `fire` back out, and offers the two shapes a click handler takes —
 * reassigning the prop to a new object, or mutating the object already passed.
 * (The Svelte suite uses a `.test.svelte` harness; harnesses inline here.)
 */
const Harness = defineComponent({
	setup(_props, { expose }) {
		const opts = ref<ConfettiOptions>({ particleCount: 50 });
		const confetti = ref<{ fire: (o?: ConfettiOptions) => void } | null>(null);

		expose({
			/** Reassigns `options` to a NEW object and fires in the same tick. */
			bumpAndFireSameTick() {
				opts.value = { particleCount: 500 };
				confetti.value?.fire();
			},
			/** Mutates the object already passed as `options` and fires in the same tick. */
			mutateAndFireSameTick() {
				opts.value.particleCount = 500;
				confetti.value?.fire();
			},
			fire(o?: ConfettiOptions) {
				confetti.value?.fire(o);
			},
		});

		return () => h(Confetti, { ref: confetti, options: opts.value, manualStart: true });
	},
});

describe("Confetti.fire() options freshness", () => {
	beforeEach(() => {
		HTMLCanvasElement.prototype.getContext = (() => ({})) as never;
		instance.mockClear();
		instance.reset.mockClear();
	});

	afterEach(() => {
		HTMLCanvasElement.prototype.getContext = originalGetContext;
		vi.restoreAllMocks();
	});

	// Parity with Svelte: `fire()` reads `options` at call time, so a handler
	// that touches the object it already handed down bursts with the new value.
	it("uses options mutated in place in the same tick as the fire() call", () => {
		const wrapper = mount(Harness);

		(wrapper.vm as unknown as { mutateAndFireSameTick: () => void }).mutateAndFireSameTick();

		expect(instance).toHaveBeenCalledWith({ particleCount: 500 });
		wrapper.unmount();
	});

	// DECLARED DIVERGENCE from Svelte. The Svelte suite pins the reassignment
	// shape at { particleCount: 500 }: Svelte props are live bindings, so the
	// child sees the new object before `fire()` runs. Vue hands a reassigned
	// prop to the child only on the parent's next render, so the same handler
	// bursts with the PREVIOUS object. Framework-inherent — Vue exposes no
	// synchronous flush — and recorded as a divergence rather than papered over.
	it("does NOT see options reassigned in the same tick as the fire() call (divergence)", async () => {
		const wrapper = mount(Harness);

		(wrapper.vm as unknown as { bumpAndFireSameTick: () => void }).bumpAndFireSameTick();

		expect(instance).toHaveBeenCalledWith({ particleCount: 50 });

		// The reassignment is not lost, only deferred: the next fire() after the
		// parent has re-rendered uses it.
		await nextTick();
		instance.mockClear();
		(wrapper.vm as unknown as { fire: (o?: ConfettiOptions) => void }).fire();

		expect(instance).toHaveBeenCalledWith({ particleCount: 500 });
		wrapper.unmount();
	});

	it("merges the fire() argument over the current options prop", () => {
		const wrapper = mount(Harness);

		(wrapper.vm as unknown as { fire: (o?: ConfettiOptions) => void }).fire({ spread: 9 });

		expect(instance).toHaveBeenCalledWith({ particleCount: 50, spread: 9 });
		wrapper.unmount();
	});

	// The guard the barrel-wide hydration sweep needs: with no 2D context the
	// engine is never built, so `fire()` is a no-op and unmount has nothing to
	// reset — previously `reset()` dereferenced the null context and threw.
	it("stays inert and unmounts cleanly when the canvas has no 2D context", () => {
		HTMLCanvasElement.prototype.getContext = (() => null) as never;

		const wrapper = mount(Confetti);
		(wrapper.vm as unknown as { fire: (o?: ConfettiOptions) => void }).fire();

		expect(instance).not.toHaveBeenCalled();
		expect(() => wrapper.unmount()).not.toThrow();
		expect(instance.reset).not.toHaveBeenCalled();
	});

	it("resets the instance exactly once when unmounted", () => {
		const wrapper = mount(Confetti, { props: { manualStart: true } });

		expect(instance.reset).not.toHaveBeenCalled();

		wrapper.unmount();

		expect(instance.reset).toHaveBeenCalledTimes(1);
	});
});
