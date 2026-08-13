import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { lockScroll } from "./scroll-lock";

function setViewport(innerWidth: number, clientWidth: number) {
	Object.defineProperty(window, "innerWidth", { value: innerWidth, configurable: true });
	Object.defineProperty(document.documentElement, "clientWidth", {
		value: clientWidth,
		configurable: true,
	});
}

describe("lockScroll", () => {
	beforeEach(() => {
		// A 15px gutter by default — most tests below care about locking
		// behaviour, not the scrollbar measurement itself.
		setViewport(1024, 1009);
	});

	afterEach(() => {
		document.body.style.cssText = "";
		document.documentElement.style.cssText = "";
	});

	it("locks the body by pinning it fixed at the current scroll position", () => {
		Object.defineProperty(window, "scrollY", { value: 240, configurable: true });

		const release = lockScroll();

		expect(document.body.style.position).toBe("fixed");
		expect(document.body.style.top).toBe("-240px");
		expect(document.body.style.overflow).toBe("hidden");

		release();
	});

	it("restores the body's original inline styles on release", () => {
		document.body.style.position = "relative";
		document.body.style.top = "3px";

		const release = lockScroll();
		release();

		expect(document.body.style.position).toBe("relative");
		expect(document.body.style.top).toBe("3px");
		expect(document.body.style.overflow).toBe("");
	});

	it("restores the scroll position on release", () => {
		Object.defineProperty(window, "scrollY", { value: 512, configurable: true });
		const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

		const release = lockScroll();
		release();

		expect(scrollToSpy).toHaveBeenCalledWith(0, 512);
		scrollToSpy.mockRestore();
	});

	it("reference-counts nested acquisitions: only the last release unlocks", () => {
		const releaseOuter = lockScroll(); // e.g. a Dialog opening
		const releaseInner = lockScroll(); // e.g. a Popover opening inside it

		expect(document.body.style.position).toBe("fixed");

		releaseInner(); // closing the Popover must not unlock the page
		expect(document.body.style.position).toBe("fixed");

		releaseOuter(); // only the last release actually unlocks
		expect(document.body.style.position).toBe("");
	});

	it("is idempotent: calling the same release twice does not double-decrement the count", () => {
		const releaseA = lockScroll();
		const releaseB = lockScroll();

		releaseA();
		releaseA(); // second call must be a no-op, not an extra decrement
		expect(document.body.style.position).toBe("fixed"); // still locked by B

		releaseB();
		expect(document.body.style.position).toBe("");
	});

	it("re-locks cleanly after a full lock/release cycle", () => {
		lockScroll()();
		expect(document.body.style.position).toBe("");

		const release = lockScroll();
		expect(document.body.style.position).toBe("fixed");
		release();
		expect(document.body.style.position).toBe("");
	});

	it("compensates for the scrollbar gutter with padding-right", () => {
		setViewport(1024, 1009); // 15px gutter
		document.body.style.paddingRight = "4px";

		const release = lockScroll();
		expect(document.body.style.paddingRight).toBe("19px"); // 4 existing + 15 gutter

		release();
		expect(document.body.style.paddingRight).toBe("4px");
	});

	it("is a no-op on platforms with overlay scrollbars (zero gutter)", () => {
		setViewport(1024, 1024); // no gutter at all
		document.body.style.paddingRight = "";

		const release = lockScroll();
		// Must stay exactly empty — never "0px" written over nothing.
		expect(document.body.style.paddingRight).toBe("");

		release();
	});

	it("returns a no-op release without throwing when document is unavailable", () => {
		const originalDocument = globalThis.document;
		// @ts-expect-error simulating an SSR environment for this one call
		delete globalThis.document;

		let release: () => void = () => {};
		expect(() => {
			release = lockScroll();
		}).not.toThrow();
		expect(() => release()).not.toThrow();

		globalThis.document = originalDocument;
	});
});
