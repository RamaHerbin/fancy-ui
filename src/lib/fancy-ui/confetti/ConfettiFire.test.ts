import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";

// Same mocking shape as Confetti.test.ts: the default export is callable and
// carries `.create`, which hands back the per-canvas instance.
const instance = vi.fn() as ReturnType<typeof vi.fn> & { reset: ReturnType<typeof vi.fn> };
instance.reset = vi.fn();

vi.mock("canvas-confetti", () => {
	const globalFire = vi.fn() as ReturnType<typeof vi.fn> & { create: () => unknown };
	globalFire.create = () => instance;
	return { default: globalFire };
});

import Harness from "./ConfettiFireHarness.test.svelte";

// Regression net for the engine extraction: `fire()` has always read the
// `options` prop synchronously at call time, so a parent that reassigns
// `options` and calls `fire()` in one handler must burst with the NEW options.
// Routing the prop through a deferred `$effect` instead would fire the stale
// value — this test fails in that shape.
describe("Confetti.fire() options freshness", () => {
	afterEach(cleanup);

	it("uses options reassigned in the same tick as the fire() call", () => {
		const { component } = render(Harness) as unknown as {
			component: { bumpAndFireSameTick: () => void };
		};

		component.bumpAndFireSameTick();

		expect(instance).toHaveBeenCalledWith({ particleCount: 500 });
	});
});
