import { render, cleanup } from "@testing-library/vue";
import { defineComponent, h } from "vue";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { useScrollLock } from "./use-scroll-lock.js";

function setViewport(innerWidth: number, clientWidth: number) {
	Object.defineProperty(window, "innerWidth", { value: innerWidth, configurable: true });
	Object.defineProperty(document.documentElement, "clientWidth", {
		value: clientWidth,
		configurable: true,
	});
}

const Harness = defineComponent({
	props: { enabled: { type: Boolean, default: true } },
	setup(props) {
		useScrollLock(() => props.enabled);
		return () => h("div");
	},
});

describe("useScrollLock", () => {
	// Every release calls `window.scrollTo`, which jsdom does not implement —
	// stubbed for the whole suite so the leak assertions below have something
	// to read and the other cases do not print a not-implemented trace.
	let scrollTo: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		setViewport(1024, 1009);
		scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	});

	afterEach(() => {
		cleanup();
		scrollTo.mockRestore();
		document.body.style.cssText = "";
		document.documentElement.style.cssText = "";
	});

	it("acquires on mount", () => {
		render(Harness);
		expect(document.body.style.position).toBe("fixed");
	});

	it("releases on unmount", () => {
		const { unmount } = render(Harness);
		expect(document.body.style.position).toBe("fixed");
		unmount();
		expect(document.body.style.position).toBe("");
	});

	it("does not acquire when enabled starts false", () => {
		render(Harness, { props: { enabled: false } });
		expect(document.body.style.position).toBe("");
	});

	it("acquires when enabled flips true, and releases when it flips back false", async () => {
		const { rerender } = render(Harness, { props: { enabled: false } });
		expect(document.body.style.position).toBe("");

		await rerender({ enabled: true });
		expect(document.body.style.position).toBe("fixed");

		await rerender({ enabled: false });
		expect(document.body.style.position).toBe("");
	});

	it("reference-counts like lockScroll(): two mounted instances, only the last release unlocks", () => {
		const a = render(Harness);
		const b = render(Harness);
		expect(document.body.style.position).toBe("fixed");

		b.unmount();
		expect(document.body.style.position).toBe("fixed");

		a.unmount();
		expect(document.body.style.position).toBe("");
	});

	// Leak suite (§9.4). Vue has no double-invoke, so the coverage React buys
	// with StrictMode is bought here with a mount / unmount / mount / unmount
	// cycle: `document.body.style.position` is `"fixed"` while mounted and
	// back to `""` after, and the scroll position is restored on each release.
	// This works only because `saved` is re-captured on every
	// `lockCount === 0` transition and `released` is per-acquisition — both
	// already true in the shared core.
	it("leak suite: mount / unmount / mount / unmount leaves the body at rest and the scroll restored", () => {
		Object.defineProperty(window, "scrollY", { value: 300, configurable: true });
		document.body.style.paddingRight = "7px";

		const first = render(Harness);
		expect(document.body.style.position).toBe("fixed");
		expect(document.body.style.top).toBe("-300px");
		first.unmount();

		expect(document.body.style.position).toBe("");
		expect(document.body.style.top).toBe("");
		expect(document.body.style.overflow).toBe("");
		expect(document.body.style.paddingRight).toBe("7px");
		expect(scrollTo).toHaveBeenNthCalledWith(1, 0, 300);

		// Second cycle: a leaked acquisition from the first would leave
		// `lockCount` at 1, so this mount would never re-capture `saved` and
		// the unmount below would never unlock.
		Object.defineProperty(window, "scrollY", { value: 90, configurable: true });
		const second = render(Harness);
		expect(document.body.style.position).toBe("fixed");
		expect(document.body.style.top).toBe("-90px");
		second.unmount();

		expect(document.body.style.position).toBe("");
		expect(document.body.style.top).toBe("");
		expect(document.body.style.paddingRight).toBe("7px");
		expect(scrollTo).toHaveBeenNthCalledWith(2, 0, 90);
		expect(scrollTo).toHaveBeenCalledTimes(2);
	});
});
