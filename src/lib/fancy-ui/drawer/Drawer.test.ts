import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";

// `vi.mock` factories are hoisted above imports and may not close over
// outer-scope variables directly — `vi.hoisted` is the escape hatch that
// still lets the test body assert on the same mock instances the component
// actually calls.
const { lockScrollMock, releaseMock } = vi.hoisted(() => {
	const releaseMock = vi.fn();
	const lockScrollMock = vi.fn(() => releaseMock);
	return { lockScrollMock, releaseMock };
});

vi.mock("../_internals/scroll-lock.js", () => ({
	lockScroll: lockScrollMock,
}));

import Drawer from "./Drawer.svelte";
import Harness from "./DrawerHarness.test.svelte";

// Mirrors Drawer.svelte's own (not exported) DISMISS_THRESHOLD_PX — kept as a
// named constant here too so the boundary tests below read as "exactly at"
// and "one past" rather than a bare, unexplained 96/97.
const DISMISS_THRESHOLD_PX = 96;

function dialog(): HTMLElement | null {
	return document.querySelector('[role="dialog"]');
}

function scrim(): HTMLElement | null {
	return document.querySelector(".ft-drawer-scrim");
}

function closeButton(): HTMLButtonElement | null {
	return document.querySelector(".ft-drawer-close");
}

function dragSurface(): HTMLElement {
	return document.querySelector(".ft-drawer-drag-surface") as HTMLElement;
}

function pressEscape() {
	return fireEvent.keyDown(document, { key: "Escape" });
}

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

// Drives the same handle a real touch/mouse drag would: down at clientY 0,
// one move to `deltaY`, then up — the component only reads the distance
// between down and the latest move, so a single move step is enough to
// exercise the threshold decision.
async function drag(deltaY: number, pointerId = 1) {
	await fireEvent.pointerDown(dragSurface(), { pointerId, clientY: 0, pointerType: "touch" });
	await fireEvent.pointerMove(dragSurface(), { pointerId, clientY: deltaY, pointerType: "touch" });
	await fireEvent.pointerUp(dragSurface(), { pointerId, clientY: deltaY, pointerType: "touch" });
}

describe("Drawer", () => {
	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
		lockScrollMock.mockClear();
		releaseMock.mockClear();
	});

	it("renders nothing while closed", () => {
		render(Drawer, { props: { title: "Filters" } });
		expect(dialog()).toBeNull();
	});

	it("renders a modal dialog when open, anchored to the bottom", () => {
		render(Drawer, { props: { open: true, title: "Filters" } });
		const el = dialog();
		expect(el).not.toBeNull();
		expect(el?.getAttribute("aria-modal")).toBe("true");
		expect(el?.className).toContain("bottom-0");
	});

	it("wires aria-labelledby to the real title id", () => {
		render(Drawer, { props: { open: true, title: "Filters" } });
		const el = dialog()!;
		const labelledby = el.getAttribute("aria-labelledby");
		expect(labelledby).toBeTruthy();
		expect(document.getElementById(labelledby!)?.textContent).toBe("Filters");
	});

	it("omits aria-labelledby when there is no title", () => {
		render(Drawer, { props: { open: true } });
		expect(dialog()!.hasAttribute("aria-labelledby")).toBe(false);
	});

	it("wires aria-describedby to the real description id", () => {
		render(Drawer, {
			props: { open: true, title: "Filters", description: "Drag down to close." },
		});
		const el = dialog()!;
		const describedby = el.getAttribute("aria-describedby");
		expect(describedby).toBeTruthy();
		expect(document.getElementById(describedby!)?.textContent).toBe("Drag down to close.");
	});

	it("omits aria-describedby when there is no description", () => {
		render(Drawer, { props: { open: true, title: "Filters" } });
		expect(dialog()!.hasAttribute("aria-describedby")).toBe(false);
	});

	it("closes on Escape when dismissible (the default)", async () => {
		const onOpenChange = vi.fn();
		render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });

		await pressEscape();

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(dialog()).toBeNull();
	});

	it("does not close on Escape when dismissible is false", async () => {
		const onOpenChange = vi.fn();
		render(Drawer, {
			props: { open: true, title: "Filters", dismissible: false, onOpenChange },
		});

		await pressEscape();

		expect(onOpenChange).not.toHaveBeenCalled();
		expect(dialog()).not.toBeNull();
	});

	it("closes when the scrim is clicked", async () => {
		const onOpenChange = vi.fn();
		render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });

		await fireEvent.pointerDown(scrim()!);

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(dialog()).toBeNull();
	});

	it("renders a close button that closes the drawer on click", async () => {
		const onOpenChange = vi.fn();
		render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });

		await fireEvent.click(closeButton()!);

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(dialog()).toBeNull();
	});

	it("omits the close button when dismissible is false", () => {
		render(Drawer, { props: { open: true, title: "Filters", dismissible: false } });
		expect(closeButton()).toBeNull();
	});

	it("moves focus into the panel on open", () => {
		render(Drawer, { props: { open: true, title: "Filters" } });
		expect(dialog()!.contains(document.activeElement)).toBe(true);
	});

	it("returns focus to the previously focused element on close", async () => {
		const trigger = document.createElement("button");
		document.body.appendChild(trigger);
		trigger.focus();

		render(Drawer, { props: { open: true, title: "Filters" } });
		expect(document.activeElement).not.toBe(trigger);

		await pressEscape();

		expect(document.activeElement).toBe(trigger);
		trigger.remove();
	});

	it("renders body and footer snippet content", () => {
		render(Drawer, {
			props: {
				open: true,
				title: "Filters",
				children: snippet("<p>Body</p>"),
				footer: snippet('<button type="button">Apply</button>'),
			},
		});
		expect(dialog()!.textContent).toContain("Body");
		expect(dialog()!.textContent).toContain("Apply");
	});

	it("merges a custom class onto the panel", () => {
		render(Drawer, { props: { open: true, title: "Filters", class: "my-drawer" } });
		expect(dialog()!.className).toContain("my-drawer");
	});

	it("acquires the scroll lock on open and releases it on close", async () => {
		render(Drawer, { props: { open: true, title: "Filters" } });

		expect(lockScrollMock).toHaveBeenCalledTimes(1);
		expect(releaseMock).not.toHaveBeenCalled();

		await pressEscape();
		expect(releaseMock).toHaveBeenCalledTimes(1);
	});

	it("releases the scroll lock on unmount even if still open", () => {
		const { unmount } = render(Drawer, { props: { open: true, title: "Filters" } });
		expect(lockScrollMock).toHaveBeenCalledTimes(1);

		unmount();
		expect(releaseMock).toHaveBeenCalledTimes(1);
	});

	describe("swipe to close", () => {
		it("closes when dragged past the dismiss threshold", async () => {
			const onOpenChange = vi.fn();
			render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });

			await drag(150);

			expect(onOpenChange).toHaveBeenCalledWith(false);
			expect(dialog()).toBeNull();
		});

		it("springs back at exactly the threshold — only a drag strictly past it dismisses", async () => {
			const onOpenChange = vi.fn();
			render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });

			await drag(DISMISS_THRESHOLD_PX);

			expect(onOpenChange).not.toHaveBeenCalled();
			expect(dialog()).not.toBeNull();
		});

		it("closes one pixel past the threshold", async () => {
			const onOpenChange = vi.fn();
			render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });

			await drag(DISMISS_THRESHOLD_PX + 1);

			expect(onOpenChange).toHaveBeenCalledWith(false);
			expect(dialog()).toBeNull();
		});

		it("captures the pointer on drag start and releases it on drag end, with the same pointerId", async () => {
			// jsdom implements neither method, so `setPointerCapture`/
			// `releasePointerCapture` are stubbed directly on the element
			// rather than spied on an existing implementation. This proves the
			// calls are still wired (the realistic regression: someone deletes
			// them because jsdom never exercises them) — it does NOT prove
			// capture itself works, since jsdom cannot model a real cursor
			// leaving the element mid-drag.
			render(Drawer, { props: { open: true, title: "Filters" } });
			const surface = dragSurface();
			const setCapture = vi.fn();
			const releaseCaptureSpy = vi.fn();
			Object.assign(surface, {
				setPointerCapture: setCapture,
				releasePointerCapture: releaseCaptureSpy,
			});

			await fireEvent.pointerDown(surface, { pointerId: 7, clientY: 0, pointerType: "touch" });
			expect(setCapture).toHaveBeenCalledWith(7);
			expect(releaseCaptureSpy).not.toHaveBeenCalled();

			await fireEvent.pointerUp(surface, { pointerId: 7, clientY: 10, pointerType: "touch" });
			expect(releaseCaptureSpy).toHaveBeenCalledWith(7);
		});

		it("springs back and leaves the drawer open when the drag falls short of the threshold", async () => {
			const onOpenChange = vi.fn();
			render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });

			await drag(40);

			expect(onOpenChange).not.toHaveBeenCalled();
			expect(dialog()).not.toBeNull();
			// The offset resets to 0 immediately regardless of the spring-back
			// transition (which is a CSS-only concern gated behind reduced
			// motion) — the state itself is not left sitting at the drag
			// distance.
			expect(dialog()!.style.transform).toBe("translateY(0px)");
		});

		it("ignores the gesture entirely when swipeToClose is false", async () => {
			const onOpenChange = vi.fn();
			render(Drawer, {
				props: { open: true, title: "Filters", swipeToClose: false, onOpenChange },
			});

			await drag(150);

			expect(onOpenChange).not.toHaveBeenCalled();
			expect(dialog()).not.toBeNull();
			expect(dialog()!.style.transform).toBe("translateY(0px)");
		});

		it("ignores the gesture when dismissible is false, even with swipeToClose true", async () => {
			const onOpenChange = vi.fn();
			render(Drawer, {
				props: { open: true, title: "Filters", dismissible: false, onOpenChange },
			});

			await drag(150);

			expect(onOpenChange).not.toHaveBeenCalled();
			expect(dialog()).not.toBeNull();
		});

		it("is still fully usable with swipeToClose false: Escape and the scrim keep working", async () => {
			const onOpenChange = vi.fn();
			render(Drawer, {
				props: { open: true, title: "Filters", swipeToClose: false, onOpenChange },
			});

			await pressEscape();

			expect(onOpenChange).toHaveBeenCalledWith(false);
			expect(dialog()).toBeNull();
		});
	});

	it("works with a plain non-bound open plus a callback: the callback observes the close, and the panel still unmounts", async () => {
		const onOpenChange = vi.fn();
		render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });

		await fireEvent.click(closeButton()!);

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(dialog()).toBeNull();
	});

	it("works with the callback alone (no open prop passed at all)", () => {
		const onOpenChange = vi.fn();
		render(Drawer, { props: { title: "Filters", onOpenChange } });

		expect(dialog()).toBeNull();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("round-trips open through bind:open in both directions", async () => {
		const { getByTestId } = render(Harness);

		expect(dialog()).toBeNull();
		expect(getByTestId("bound-open").textContent).toBe("false");

		await fireEvent.click(getByTestId("trigger"));
		expect(dialog()).not.toBeNull();
		expect(getByTestId("bound-open").textContent).toBe("true");

		await fireEvent.click(closeButton()!);
		expect(dialog()).toBeNull();
		expect(getByTestId("bound-open").textContent).toBe("false");
	});

	it("round-trips the panel element through bind:ref", async () => {
		const { getByTestId } = render(Harness);
		await fireEvent.click(getByTestId("trigger"));
		expect(dialog()!.getAttribute("data-bound-ref")).toBe("yes");
	});
});
