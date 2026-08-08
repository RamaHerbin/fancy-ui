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

import Sheet from "./Sheet.svelte";
import Harness from "./SheetHarness.test.svelte";
import type { SheetSide, SheetSize } from "./Sheet.svelte";

function dialog(): HTMLElement | null {
	return document.querySelector('[role="dialog"]');
}

function scrim(): HTMLElement | null {
	return document.querySelector(".ft-sheet-scrim");
}

function closeButton(): HTMLButtonElement | null {
	return document.querySelector(".ft-sheet-close");
}

function pressEscape() {
	return fireEvent.keyDown(document, { key: "Escape" });
}

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

describe("Sheet", () => {
	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
		lockScrollMock.mockClear();
		releaseMock.mockClear();
	});

	it("renders nothing while closed", () => {
		render(Sheet, { props: { title: "Settings" } });
		expect(dialog()).toBeNull();
	});

	it("renders a modal dialog when open", () => {
		render(Sheet, { props: { open: true, title: "Settings" } });
		const el = dialog();
		expect(el).not.toBeNull();
		expect(el?.getAttribute("aria-modal")).toBe("true");
	});

	it("wires aria-labelledby to the real title id", () => {
		render(Sheet, { props: { open: true, title: "Settings" } });
		const el = dialog()!;
		const labelledby = el.getAttribute("aria-labelledby");
		expect(labelledby).toBeTruthy();
		expect(document.getElementById(labelledby!)?.textContent).toBe("Settings");
	});

	it("omits aria-labelledby when there is no title", () => {
		render(Sheet, { props: { open: true } });
		expect(dialog()!.hasAttribute("aria-labelledby")).toBe(false);
	});

	it("wires aria-describedby to the real description id", () => {
		render(Sheet, {
			props: { open: true, title: "Settings", description: "Update your preferences." },
		});
		const el = dialog()!;
		const describedby = el.getAttribute("aria-describedby");
		expect(describedby).toBeTruthy();
		expect(document.getElementById(describedby!)?.textContent).toBe("Update your preferences.");
	});

	it("omits aria-describedby when there is no description", () => {
		render(Sheet, { props: { open: true, title: "Settings" } });
		expect(dialog()!.hasAttribute("aria-describedby")).toBe(false);
	});

	it("closes on Escape when dismissible (the default)", async () => {
		const onOpenChange = vi.fn();
		render(Sheet, { props: { open: true, title: "Settings", onOpenChange } });

		await pressEscape();

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(dialog()).toBeNull();
	});

	it("does not close on Escape when dismissible is false", async () => {
		const onOpenChange = vi.fn();
		render(Sheet, { props: { open: true, title: "Settings", dismissible: false, onOpenChange } });

		await pressEscape();

		expect(onOpenChange).not.toHaveBeenCalled();
		expect(dialog()).not.toBeNull();
	});

	it("closes when the scrim is clicked", async () => {
		const onOpenChange = vi.fn();
		render(Sheet, { props: { open: true, title: "Settings", onOpenChange } });

		await fireEvent.pointerDown(scrim()!);

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(dialog()).toBeNull();
	});

	it("does not close on scrim click when dismissible is false", async () => {
		const onOpenChange = vi.fn();
		render(Sheet, { props: { open: true, title: "Settings", dismissible: false, onOpenChange } });

		await fireEvent.pointerDown(scrim()!);

		expect(onOpenChange).not.toHaveBeenCalled();
		expect(dialog()).not.toBeNull();
	});

	it("renders a close button that closes the sheet on click", async () => {
		const onOpenChange = vi.fn();
		render(Sheet, { props: { open: true, title: "Settings", onOpenChange } });

		await fireEvent.click(closeButton()!);

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(dialog()).toBeNull();
	});

	it("omits the close button when dismissible is false", () => {
		render(Sheet, { props: { open: true, title: "Settings", dismissible: false } });
		expect(closeButton()).toBeNull();
	});

	it("moves focus into the panel on open", () => {
		render(Sheet, { props: { open: true, title: "Settings" } });
		expect(dialog()!.contains(document.activeElement)).toBe(true);
	});

	it("returns focus to the previously focused element on close", async () => {
		const trigger = document.createElement("button");
		document.body.appendChild(trigger);
		trigger.focus();

		render(Sheet, { props: { open: true, title: "Settings" } });
		expect(document.activeElement).not.toBe(trigger);

		await pressEscape();

		expect(document.activeElement).toBe(trigger);
		trigger.remove();
	});

	it.each<{ side: SheetSide; border: string; axisClass: string; otherAxisClass: string }>([
		// `axisClass`/`otherAxisClass` catch WIDTH_CLASSES/HEIGHT_CLASSES being
		// swapped in `dimensionClasses`: a horizontal side (left/right) sizes
		// with a fixed width and `h-dvh`; a vertical side (top/bottom) sizes
		// with a fixed height and `w-full` — asserting only the position
		// classes (as the previous version of this test did) would pass even
		// with the two swapped.
		{ side: "left", border: "border-r", axisClass: "h-dvh", otherAxisClass: "w-full" },
		{ side: "right", border: "border-l", axisClass: "h-dvh", otherAxisClass: "w-full" },
		{ side: "top", border: "border-b", axisClass: "w-full", otherAxisClass: "h-dvh" },
		{ side: "bottom", border: "border-t", axisClass: "w-full", otherAxisClass: "h-dvh" },
	])(
		"renders side=$side with its own data-side, border side and sizing axis",
		({ side, border, axisClass, otherAxisClass }) => {
			render(Sheet, { props: { open: true, title: "Settings", side } });
			const el = dialog()!;
			expect(el.getAttribute("data-side")).toBe(side);
			expect(el.className).toContain(`${side}-0`);
			expect(el.className).toContain(
				side === "left" || side === "right" ? "inset-y-0" : "inset-x-0"
			);
			expect(el.className).toContain(border);
			expect(el.className).toContain(axisClass);
			expect(el.className).not.toContain(otherAxisClass);
		}
	);

	it("defaults to side right", () => {
		render(Sheet, { props: { open: true, title: "Settings" } });
		expect(dialog()!.getAttribute("data-side")).toBe("right");
	});

	it.each<[SheetSize, string]>([
		["sm", "w-[20rem]"],
		["md", "w-[24rem]"],
		["lg", "w-[32rem]"],
	])("size=%s sets the matching width class on a horizontal side (right)", (size, widthClass) => {
		render(Sheet, { props: { open: true, title: "Settings", side: "right", size } });
		expect(dialog()!.className).toContain(widthClass);
	});

	it.each<[SheetSize, string]>([
		["sm", "h-[14rem]"],
		["md", "h-[18rem]"],
		["lg", "h-[24rem]"],
	])("size=%s sets the matching height class on a vertical side (bottom)", (size, heightClass) => {
		render(Sheet, { props: { open: true, title: "Settings", side: "bottom", size } });
		expect(dialog()!.className).toContain(heightClass);
	});

	it("defaults to size md", () => {
		render(Sheet, { props: { open: true, title: "Settings", side: "right" } });
		expect(dialog()!.className).toContain("w-[24rem]");
	});

	it("renders body and footer snippet content", () => {
		render(Sheet, {
			props: {
				open: true,
				title: "Settings",
				children: snippet("<p>Body</p>"),
				footer: snippet('<button type="button">Save</button>'),
			},
		});
		expect(dialog()!.textContent).toContain("Body");
		expect(dialog()!.textContent).toContain("Save");
	});

	it("merges a custom class onto the panel", () => {
		render(Sheet, { props: { open: true, title: "Settings", class: "my-sheet" } });
		expect(dialog()!.className).toContain("my-sheet");
	});

	it("acquires the scroll lock on open and releases it on close", async () => {
		const { unmount } = render(Sheet, { props: { open: true, title: "Settings" } });

		expect(lockScrollMock).toHaveBeenCalledTimes(1);
		expect(releaseMock).not.toHaveBeenCalled();

		await pressEscape();
		expect(releaseMock).toHaveBeenCalledTimes(1);

		unmount();
	});

	it("releases the scroll lock on unmount even if still open", () => {
		const { unmount } = render(Sheet, { props: { open: true, title: "Settings" } });
		expect(lockScrollMock).toHaveBeenCalledTimes(1);

		unmount();
		expect(releaseMock).toHaveBeenCalledTimes(1);
	});

	it("never acquires the scroll lock while closed", () => {
		render(Sheet, { props: { title: "Settings" } });
		expect(lockScrollMock).not.toHaveBeenCalled();
	});

	it("works with a plain non-bound open plus a callback: the callback observes the close, and the panel still unmounts", async () => {
		const onOpenChange = vi.fn();
		render(Sheet, { props: { open: true, title: "Settings", onOpenChange } });

		await fireEvent.click(closeButton()!);

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(dialog()).toBeNull();
	});

	it("works with the callback alone (no open prop passed at all)", () => {
		const onOpenChange = vi.fn();
		render(Sheet, { props: { title: "Settings", onOpenChange } });

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
