import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import GlowingEffect from "./GlowingEffect.svelte";

// Regression net for the prop-liveness contract: before the core extraction the
// rAF callbacks re-read `inactiveZone` / `proximity` / `movementDuration` on every
// frame, so the wrapper must keep pushing them into the engine after mount.
// GlowingEffect.test.ts never sets `disabled`, so it never reaches the engine.
describe("GlowingEffect live props", () => {
	afterEach(cleanup);

	it("pushes proximity changes into the running engine without a remount", async () => {
		const callbacks: FrameRequestCallback[] = [];
		vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
			callbacks.push(cb);
			return 1;
		});
		vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
		const flush = () => {
			for (const cb of callbacks.splice(0, callbacks.length)) cb(0);
		};

		const { container, rerender } = render(GlowingEffect, {
			props: { disabled: false, inactiveZone: 0.1, proximity: 0 },
		});
		const target = container.querySelector("[style]") as HTMLElement;
		vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
			left: 0,
			top: 0,
			width: 100,
			height: 100,
			right: 100,
			bottom: 100,
			x: 0,
			y: 0,
			toJSON() {
				return this;
			},
		} as DOMRect);

		document.body.dispatchEvent(new PointerEvent("pointermove", { clientX: 150, clientY: 50 }));
		flush();
		expect(target.style.getPropertyValue("--active")).toBe("0");

		await rerender({ disabled: false, inactiveZone: 0.1, proximity: 100 });

		document.body.dispatchEvent(new PointerEvent("pointermove", { clientX: 150, clientY: 50 }));
		flush();
		expect(target.style.getPropertyValue("--active")).toBe("1");

		vi.restoreAllMocks();
	});
});
