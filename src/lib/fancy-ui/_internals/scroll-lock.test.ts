import { render, cleanup, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { lockScroll, scrollLock } from "./scroll-lock";
import Harness from "./ScrollLockHarness.test.svelte";

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

describe("scrollLock — the action form", () => {
	beforeEach(() => {
		setViewport(1024, 1009);
	});

	afterEach(() => {
		cleanup();
		document.body.style.cssText = "";
		document.documentElement.style.cssText = "";
	});

	it("acquires on mount and releases on destroy", () => {
		const node = document.createElement("div");
		document.body.appendChild(node);

		const action = scrollLock(node);
		expect(document.body.style.position).toBe("fixed");

		action?.destroy?.();
		expect(document.body.style.position).toBe("");
		node.remove();
	});

	it("reference-counts like lockScroll(): two mounts, and only the second destroy unlocks", () => {
		const outer = document.createElement("div");
		const inner = document.createElement("div");
		document.body.append(outer, inner);

		const a = scrollLock(outer);
		const b = scrollLock(inner);
		expect(document.body.style.position).toBe("fixed");

		b?.destroy?.(); // e.g. a Popover inside the dialog closing
		expect(document.body.style.position).toBe("fixed");

		a?.destroy?.();
		expect(document.body.style.position).toBe("");
		outer.remove();
		inner.remove();
	});
});

// THE PLATFORM-FACT PROOF, and the gate on the rest of the campaign.
//
// The claim: a LOCAL transition on a CHILD component's root element is
// collected by the PARENT's `{#if}` when that branch closes, because Svelte's
// collector walks through the transparent effect a statically-known child
// compiles to. Five panels in the next lane are shaped exactly this way, and
// the close protocol depends on the claim holding — if it does not, the exit
// is skipped, the branch is destroyed synchronously, and the scroll lock
// releases while the surface is still on screen.
//
// The scroll lock is the instrument rather than the subject: it reads the
// delay directly, with no mock in between. If the outro is collected, the
// action's `destroy()` waits for it and the body stays pinned; if it is not,
// the body unlocks in the same flush.
describe("scrollLock — a child component's exit still delays the parent's unmount", () => {
	beforeEach(() => {
		setViewport(1024, 1009);
	});

	afterEach(() => {
		cleanup();
		document.body.style.cssText = "";
		document.documentElement.style.cssText = "";
	});

	it("keeps the panel mounted and the page locked for the length of the exit", async () => {
		const { container } = render(Harness);
		const toggle = container.querySelector<HTMLButtonElement>('[data-testid="toggle"]')!;
		const panel = () => document.querySelector('[data-testid="panel"]');
		expect(panel()).toBeNull();

		toggle.click();
		await tick();
		expect(panel()).not.toBeNull();
		expect(document.body.style.position).toBe("fixed");

		toggle.click();
		await tick();

		// Still here, still locked: the child's transition WAS collected by the
		// parent's `{#if}`. If it had not been, the branch would have been
		// destroyed in that same flush and both assertions would invert.
		expect(panel()).not.toBeNull();
		expect((panel() as HTMLElement).inert).toBe(true);
		expect(document.body.style.position).toBe("fixed");

		// And both land once the exit finishes.
		await waitFor(() => expect(panel()).toBeNull());
		await waitFor(() => expect(document.body.style.position).toBe(""));
	});
});
