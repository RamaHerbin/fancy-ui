import { StrictMode } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { lockScroll, useScrollLock } from "./scroll-lock.js";

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

/**
 * The panel every overlay is shaped like: the hook is called INSIDE the
 * subtree that stays mounted for the whole exit, and `open` is never handed
 * to it.
 */
function Panel({ enabled }: { enabled?: boolean }) {
	useScrollLock(enabled);
	return <div data-testid="panel">panel</div>;
}

describe("useScrollLock", () => {
	beforeEach(() => {
		setViewport(1024, 1009);
		vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		document.body.style.cssText = "";
		document.documentElement.style.cssText = "";
	});

	it("acquires on mount and releases on unmount", () => {
		const { unmount } = render(<Panel />);
		expect(document.body.style.position).toBe("fixed");

		unmount();
		expect(document.body.style.position).toBe("");
	});

	it("reference-counts like lockScroll(): two mounts, and only the second unmount unlocks", () => {
		const outer = render(<Panel />);
		const inner = render(<Panel />); // e.g. a Popover opening inside the dialog
		expect(document.body.style.position).toBe("fixed");

		inner.unmount();
		expect(document.body.style.position).toBe("fixed");

		outer.unmount();
		expect(document.body.style.position).toBe("");
	});

	it("does not lock while enabled is false, and locks on the flip", () => {
		const { rerender } = render(<Panel enabled={false} />);
		expect(document.body.style.position).toBe("");

		rerender(<Panel enabled />);
		expect(document.body.style.position).toBe("fixed");

		rerender(<Panel enabled={false} />);
		expect(document.body.style.position).toBe("");
	});

	it("holds the lock across a re-render that changes nothing it cares about", () => {
		const { rerender } = render(<Panel />);
		expect(document.body.style.position).toBe("fixed");

		rerender(<Panel />);
		expect(document.body.style.position).toBe("fixed");
	});

	// The StrictMode cycle drives the refcount 1 → 0 → 1 inside one commit,
	// before paint: the release restores the body styles and scrolls back, and
	// the second acquire re-reads the now-restored scroll position and applies
	// again. Asserted here so a future refactor cannot leave the count at 0
	// with a panel on screen.
	it("stays locked through a StrictMode double mount, and unlocks on unmount", () => {
		const { unmount } = render(
			<StrictMode>
				<Panel />
			</StrictMode>
		);
		expect(document.body.style.position).toBe("fixed");

		unmount();
		expect(document.body.style.position).toBe("");
	});
});

// The React counterpart of the Svelte suite's platform-fact proof. There, the
// claim under test was that a child component's outro is collected by the
// parent's `{#if}`, so the action's `destroy()` — and the release with it — is
// delayed for the length of the exit. Here the mechanism is mounting scope:
// the hook is called inside the subtree the panel's exit keeps alive and is
// never given `open`, so the release cannot land early no matter what `open`
// does. The scroll lock is again the instrument rather than the subject — it
// reads the timing directly, with no mock in between.
describe("useScrollLock — release is bound to unmounting, not to `open`", () => {
	beforeEach(() => {
		setViewport(1024, 1009);
		vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		document.body.style.cssText = "";
		document.documentElement.style.cssText = "";
	});

	/**
	 * `mounted` stands in for what a presence leg keeps alive during the exit;
	 * `open` is the flag the panel would animate on. Deliberately two separate
	 * props, and deliberately NOT passed to `useScrollLock` — that is the whole
	 * timing rule.
	 */
	function Surface({ open, mounted }: { open: boolean; mounted: boolean }) {
		return (
			<>
				<div data-testid="state">{open ? "open" : "closing"}</div>
				{mounted ? <Panel /> : null}
			</>
		);
	}

	it("keeps the page locked for the length of the exit, then unlocks", () => {
		const { rerender, queryByTestId } = render(<Surface open={false} mounted={false} />);
		expect(queryByTestId("panel")).toBeNull();
		expect(document.body.style.position).toBe("");

		rerender(<Surface open mounted />);
		expect(queryByTestId("panel")).not.toBeNull();
		expect(document.body.style.position).toBe("fixed");

		// `open` flips: the exit starts, the panel is still on screen. An
		// effect keyed on `open` would release right here and leave the page
		// scrollable under a scrim that has not finished fading.
		rerender(<Surface open={false} mounted />);
		expect(queryByTestId("state")?.textContent).toBe("closing");
		expect(queryByTestId("panel")).not.toBeNull();
		expect(document.body.style.position).toBe("fixed");

		// And both land once the exit finishes and the panel unmounts.
		rerender(<Surface open={false} mounted={false} />);
		expect(queryByTestId("panel")).toBeNull();
		expect(document.body.style.position).toBe("");
	});
});
