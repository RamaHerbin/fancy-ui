import { render, cleanup } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import HoverCard from "./HoverCard.svelte";
import Harness from "./HoverCardHarness.test.svelte";
import AriaHarness from "./HoverCardAriaHarness.test.svelte";

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

function pointerEnter(el: Element) {
	el.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, cancelable: true }));
}

function pointerLeave(el: Element) {
	el.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, cancelable: true }));
}

function pressEscape() {
	document.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
	);
}

function triggerWrapper(): HTMLElement {
	return document.querySelector(".ft-hover-card-trigger") as HTMLElement;
}

function panel(): HTMLElement | null {
	return document.body.querySelector(".ft-hover-card-panel");
}

const trigger = () => snippet('<button type="button">@handle</button>');
const content = () => snippet("<p>Rama Herbin — 1.2k followers</p>");

describe("HoverCard", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
		vi.useRealTimers();
	});

	it("renders the trigger and stays closed until interaction", () => {
		render(HoverCard, { props: { trigger: trigger(), children: content() } });
		expect(document.querySelector("button")?.textContent).toBe("@handle");
		expect(panel()).toBeNull();
	});

	it("opens after openDelay on pointerenter, not a moment before", async () => {
		const onOpenChange = vi.fn();
		render(HoverCard, {
			props: { onOpenChange, openDelay: 300, trigger: trigger(), children: content() },
		});

		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(299);
		expect(panel()).toBeNull();

		await vi.advanceTimersByTimeAsync(1);
		expect(panel()).not.toBeNull();
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(true);
	});

	it("cancels the open if the pointer leaves the trigger before openDelay elapses", async () => {
		const onOpenChange = vi.fn();
		render(HoverCard, {
			props: { onOpenChange, openDelay: 300, trigger: trigger(), children: content() },
		});

		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(150);
		pointerLeave(triggerWrapper());
		await vi.advanceTimersByTimeAsync(1000);

		expect(panel()).toBeNull();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("closes after closeDelay once the pointer leaves the trigger", async () => {
		const onOpenChange = vi.fn();
		render(HoverCard, {
			props: {
				open: true,
				onOpenChange,
				closeDelay: 150,
				trigger: trigger(),
				children: content(),
			},
		});
		expect(panel()).not.toBeNull();

		pointerLeave(triggerWrapper());
		await vi.advanceTimersByTimeAsync(149);
		expect(panel()).not.toBeNull();

		await vi.advanceTimersByTimeAsync(1);
		expect(panel()).toBeNull();
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("stays open when the pointer travels from the trigger to the card before closeDelay elapses", async () => {
		const onOpenChange = vi.fn();
		render(HoverCard, {
			props: {
				open: true,
				onOpenChange,
				closeDelay: 150,
				trigger: trigger(),
				children: content(),
			},
		});

		pointerLeave(triggerWrapper());
		await vi.advanceTimersByTimeAsync(100);
		// The pointer lands on the card before the pending close fires.
		pointerEnter(panel()!);
		await vi.advanceTimersByTimeAsync(1000);

		expect(panel()).not.toBeNull();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("closes after closeDelay once the pointer leaves the card behind it", async () => {
		const onOpenChange = vi.fn();
		render(HoverCard, {
			props: {
				open: true,
				onOpenChange,
				closeDelay: 150,
				trigger: trigger(),
				children: content(),
			},
		});

		pointerLeave(triggerWrapper());
		await vi.advanceTimersByTimeAsync(100);
		pointerEnter(panel()!);
		pointerLeave(panel()!);
		await vi.advanceTimersByTimeAsync(149);
		expect(panel()).not.toBeNull();

		await vi.advanceTimersByTimeAsync(1);
		expect(panel()).toBeNull();
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("opens immediately on focus, without waiting for openDelay", async () => {
		const onOpenChange = vi.fn();
		render(HoverCard, {
			props: { onOpenChange, openDelay: 300, trigger: trigger(), children: content() },
		});
		const button = document.querySelector("button") as HTMLButtonElement;

		button.focus();
		await vi.advanceTimersByTimeAsync(0);

		expect(panel()).not.toBeNull();
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(true);
	});

	it("closes immediately on blur, without waiting for closeDelay", async () => {
		const onOpenChange = vi.fn();
		render(HoverCard, {
			props: {
				open: true,
				onOpenChange,
				closeDelay: 150,
				trigger: trigger(),
				children: content(),
			},
		});
		const button = document.querySelector("button") as HTMLButtonElement;
		button.focus();
		await vi.advanceTimersByTimeAsync(0);
		onOpenChange.mockClear();

		button.blur();
		await vi.advanceTimersByTimeAsync(0);

		expect(panel()).toBeNull();
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	// The README says nothing inside the card should be interactive, but this
	// is the safety net for a caller who does it anyway: focus leaving the
	// trigger for something genuinely inside the card must not unmount the
	// card out from under that focus move — only a mouse click on the same
	// element would otherwise "work", which is exactly the asymmetry this
	// guards against.
	it("does not close when focus moves from the trigger into the panel", async () => {
		const onOpenChange = vi.fn();
		render(HoverCard, {
			props: {
				open: true,
				onOpenChange,
				trigger: trigger(),
				children: snippet('<a href="#" data-testid="card-link">Link</a>'),
			},
		});
		const wrapper = triggerWrapper();
		const link = document.body.querySelector('[data-testid="card-link"]') as HTMLElement;
		expect(link).not.toBeNull();

		wrapper.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: link }));
		await vi.advanceTimersByTimeAsync(0);

		expect(panel()).not.toBeNull();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("still closes when focus moves somewhere outside the panel", async () => {
		const onOpenChange = vi.fn();
		render(HoverCard, {
			props: { open: true, onOpenChange, trigger: trigger(), children: content() },
		});
		const wrapper = triggerWrapper();
		const elsewhere = document.createElement("button");
		document.body.appendChild(elsewhere);

		wrapper.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: elsewhere }));
		await vi.advanceTimersByTimeAsync(0);

		expect(panel()).toBeNull();
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		elsewhere.remove();
	});

	it("closes on Escape", async () => {
		const onOpenChange = vi.fn();
		render(HoverCard, {
			props: { open: true, onOpenChange, trigger: trigger(), children: content() },
		});

		pressEscape();
		await vi.advanceTimersByTimeAsync(0);

		expect(panel()).toBeNull();
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("hands the trigger snippet the panel's id, undefined while closed", async () => {
		render(AriaHarness);
		const button = document.querySelector('[data-testid="trigger-button"]') as HTMLButtonElement;
		expect(button.getAttribute("aria-describedby")).toBeNull();

		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(300);

		const describedBy = button.getAttribute("aria-describedby");
		expect(describedBy).toBeTruthy();
		expect(panel()!.id).toBe(describedBy);
	});

	it("clears the trigger snippet's descriptionId back to undefined once closed", async () => {
		render(AriaHarness);
		const button = document.querySelector('[data-testid="trigger-button"]') as HTMLButtonElement;

		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(300);
		expect(button.getAttribute("aria-describedby")).toBeTruthy();

		pointerLeave(triggerWrapper());
		await vi.advanceTimersByTimeAsync(150);
		expect(button.getAttribute("aria-describedby")).toBeNull();
	});

	it("works uncontrolled, with neither open nor onOpenChange passed in", async () => {
		render(HoverCard, { props: { trigger: trigger(), children: content() } });

		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(300);

		expect(panel()).not.toBeNull();
	});

	it("round-trips open through bind:open", async () => {
		const { getByTestId } = render(Harness);
		expect(getByTestId("bound-open").textContent).toBe("false");

		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(300);

		expect(getByTestId("bound-open").textContent).toBe("true");
	});
});
