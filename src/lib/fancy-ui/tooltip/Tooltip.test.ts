import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import Tooltip from "./Tooltip.svelte";

vi.mock("../_internals/anchor-position.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../_internals/anchor-position.js")>();
	return { ...actual, anchorPosition: vi.fn(actual.anchorPosition) };
});

import { anchorPosition } from "../_internals/anchor-position.js";
import { dismissable } from "../_internals/dismissable.js";

function triggerSnippet() {
	return createRawSnippet(() => ({
		render: () => `<button data-testid="trigger">♥</button>`,
	}));
}

function nonFocusableSnippet() {
	return createRawSnippet(() => ({
		render: () => `<span data-testid="trigger">♥</span>`,
	}));
}

function getTrigger(): HTMLButtonElement {
	return document.body.querySelector('[data-testid="trigger"]') as HTMLButtonElement;
}

function bubble(): HTMLElement | null {
	return document.querySelector(".ft-tooltip");
}

describe("Tooltip", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.runOnlyPendingTimers();
		cleanup();
		vi.useRealTimers();
		document.body.querySelectorAll(".ft-tooltip").forEach((el) => el.remove());
		vi.mocked(anchorPosition).mockClear();
	});

	it("does not render the bubble until opened", () => {
		render(Tooltip, { props: { content: "Add to favorites", children: triggerSnippet() } });
		expect(bubble()).toBeNull();
	});

	it("opens on focus immediately, with no delay", async () => {
		render(Tooltip, {
			props: { content: "Add to favorites", children: triggerSnippet(), openDelay: 500 },
		});
		await vi.advanceTimersByTimeAsync(0);

		await fireEvent.focus(getTrigger());
		// No `advanceTimersByTime` call at all — a focus open must not need
		// the clock to move forward.
		expect(bubble()).not.toBeNull();
		expect(bubble()?.textContent).toBe("Add to favorites");
	});

	it("opens on hover only after openDelay elapses", async () => {
		render(Tooltip, {
			props: { content: "Add to favorites", children: triggerSnippet(), openDelay: 500 },
		});

		await fireEvent.pointerEnter(getTrigger());
		expect(bubble()).toBeNull();

		await vi.advanceTimersByTimeAsync(499);
		expect(bubble()).toBeNull();

		await vi.advanceTimersByTimeAsync(1);
		expect(bubble()).not.toBeNull();
	});

	it("closes on blur", async () => {
		render(Tooltip, { props: { content: "Add to favorites", children: triggerSnippet() } });
		const trigger = getTrigger();

		await fireEvent.focus(trigger);
		expect(bubble()).not.toBeNull();

		await fireEvent.blur(trigger);
		expect(bubble()).toBeNull();
	});

	it("closes on Escape without moving focus off the trigger", async () => {
		render(Tooltip, { props: { content: "Add to favorites", children: triggerSnippet() } });
		const trigger = getTrigger();

		// `fireEvent.focus` dispatches a `focus` event without moving jsdom's
		// real `document.activeElement` — calling `.focus()` directly does
		// both, which this assertion needs.
		trigger.focus();
		await tick();
		expect(bubble()).not.toBeNull();

		await fireEvent.keyDown(trigger, { key: "Escape" });
		expect(bubble()).toBeNull();
		expect(document.activeElement).toBe(trigger);
	});

	it("participates in the shared dismissable stack — only the top-most layer reacts to Escape", async () => {
		render(Tooltip, { props: { content: "Add to favorites", children: triggerSnippet() } });
		const trigger = getTrigger();

		await fireEvent.focus(trigger);
		expect(bubble()).not.toBeNull();

		// A second layer mounts on top, the way an overlay opened while the
		// tooltip happens to be showing would (e.g. a Popover on some other
		// control). It, not the tooltip, is top-of-stack now.
		const outer = document.createElement("div");
		document.body.appendChild(outer);
		const onOuterDismiss = vi.fn();
		const outerLayer = dismissable(outer, { onDismiss: onOuterDismiss });

		await fireEvent.keyDown(document, { key: "Escape" });
		expect(onOuterDismiss).toHaveBeenCalledTimes(1);
		expect(bubble()).not.toBeNull(); // the tooltip did not also react

		outerLayer?.destroy?.();
		outer.remove();
		await fireEvent.keyDown(document, { key: "Escape" });
		expect(bubble()).toBeNull(); // now top-of-stack, so this Escape is its own
	});

	it("disabled suppresses it entirely — no open on hover or focus, no aria-describedby", async () => {
		render(Tooltip, {
			props: { content: "Add to favorites", children: triggerSnippet(), disabled: true },
		});
		const trigger = getTrigger();
		await tick();
		expect(trigger.hasAttribute("aria-describedby")).toBe(false);

		await fireEvent.focus(trigger);
		expect(bubble()).toBeNull();

		await fireEvent.pointerEnter(trigger);
		await vi.advanceTimersByTimeAsync(1000);
		expect(bubble()).toBeNull();
	});

	it("toggling disabled mid-flight closes an open tooltip, and does not pop it back open on re-enable without a fresh hover", async () => {
		const trigger = triggerSnippet();
		const { rerender } = render(Tooltip, {
			props: {
				content: "Add to favorites",
				children: trigger,
				openDelay: 500,
				disabled: false,
			},
		});
		const triggerEl = getTrigger();

		await fireEvent.pointerEnter(triggerEl);
		await vi.advanceTimersByTimeAsync(500);
		expect(bubble()).not.toBeNull();

		// The pointer never leaves — only `disabled` changes.
		await rerender({
			content: "Add to favorites",
			children: trigger,
			openDelay: 500,
			disabled: true,
		});
		expect(bubble()).toBeNull();
		expect(vi.getTimerCount()).toBe(0);

		await rerender({
			content: "Add to favorites",
			children: trigger,
			openDelay: 500,
			disabled: false,
		});
		// Must not reappear instantly — nothing re-entered, so this has to go
		// through `show()` and wait out `openDelay` again like any other open.
		expect(bubble()).toBeNull();
		await vi.advanceTimersByTimeAsync(499);
		expect(bubble()).toBeNull();
		await vi.advanceTimersByTimeAsync(1);
		expect(bubble()).not.toBeNull();
	});

	it("aria-describedby is absent while closed and points at the bubble's real id once open", async () => {
		render(Tooltip, { props: { content: "Add to favorites", children: triggerSnippet() } });
		const trigger = getTrigger();
		await tick();
		// Nothing in the DOM to point at yet — the bubble doesn't mount until
		// open, so the attribute itself must not be there either.
		expect(trigger.hasAttribute("aria-describedby")).toBe(false);

		await fireEvent.focus(trigger);
		const describedBy = trigger.getAttribute("aria-describedby");
		expect(describedBy).toBeTruthy();
		expect(bubble()?.id).toBe(describedBy);

		await fireEvent.blur(trigger);
		expect(trigger.hasAttribute("aria-describedby")).toBe(false);
	});

	it("passes side, align and offset through to the anchorPosition action", async () => {
		render(Tooltip, {
			props: {
				content: "Add to favorites",
				children: triggerSnippet(),
				side: "right",
				align: "start",
				offset: 12,
			},
		});

		await fireEvent.focus(getTrigger());
		await tick();

		const [, opts] = vi.mocked(anchorPosition).mock.calls.at(-1)!;
		expect(opts).toMatchObject({ side: "right", align: "start", offset: 12 });
		expect(opts.anchor()).toBe(getTrigger());
	});

	it("defaults to side top, align center, offset 6", async () => {
		render(Tooltip, { props: { content: "Add to favorites", children: triggerSnippet() } });

		await fireEvent.focus(getTrigger());
		await tick();

		const [, opts] = vi.mocked(anchorPosition).mock.calls.at(-1)!;
		expect(opts).toMatchObject({ side: "top", align: "center", offset: 6 });
	});

	it("leaving before the open timer fires cancels it, instead of racing a later close timer", async () => {
		// closeDelay must be nonzero for this to mean anything: at the default
		// 0, `hide()` resolves synchronously and never schedules a second
		// timer at all, so there is nothing for the cancelled open timer to
		// race against — this exact test used to pass even with `hide()`'s
		// own `clearTimers()` call deleted, for that reason.
		render(Tooltip, {
			props: {
				content: "Add to favorites",
				children: triggerSnippet(),
				openDelay: 500,
				closeDelay: 100,
			},
		});
		const trigger = getTrigger();

		await fireEvent.pointerEnter(trigger); // schedules an open timer for t=500
		await vi.advanceTimersByTimeAsync(200);
		await fireEvent.pointerLeave(trigger); // must cancel it — schedules its own close timer for t=300, well clear of t=500

		// Advance past both t=300 and the open timer's original t=500 with no
		// further events. If the open timer survived the leave, it would fire
		// here and pop the bubble open with nothing hovering or focused.
		await vi.advanceTimersByTimeAsync(1000);
		expect(bubble()).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("hovering onto the tooltip bubble itself keeps it open instead of closing it", async () => {
		render(Tooltip, {
			props: { content: "Add to favorites", children: triggerSnippet(), openDelay: 0 },
		});
		const trigger = getTrigger();

		await fireEvent.pointerEnter(trigger);
		expect(bubble()).not.toBeNull();

		// The pointer reaches the bubble before it leaves the trigger — both
		// report "hovered" at once, which is the case a single shared flag
		// gets wrong (see the component's comment on `contentHovered`).
		await fireEvent.pointerEnter(bubble()!);
		await fireEvent.pointerLeave(trigger);
		expect(bubble()).not.toBeNull();

		await fireEvent.pointerLeave(bubble()!);
		expect(bubble()).toBeNull();
	});

	it("leaving both hover and focus closes it exactly once, even when the two race", async () => {
		render(Tooltip, { props: { content: "Add to favorites", children: triggerSnippet() } });
		const trigger = getTrigger();

		await fireEvent.focus(trigger);
		await fireEvent.pointerEnter(trigger);
		expect(bubble()).not.toBeNull();

		// Both "leave" events fire in the same tick, racing each other.
		await fireEvent.blur(trigger);
		await fireEvent.pointerLeave(trigger);

		expect(bubble()).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("clears its timers on unmount", async () => {
		const { unmount } = render(Tooltip, {
			props: { content: "Add to favorites", children: triggerSnippet(), openDelay: 500 },
		});
		const trigger = getTrigger();

		await fireEvent.pointerEnter(trigger);
		expect(vi.getTimerCount()).toBeGreaterThan(0);

		unmount();
		expect(vi.getTimerCount()).toBe(0);

		await vi.advanceTimersByTimeAsync(1000);
		expect(bubble()).toBeNull();
	});

	it("warns in development when the first child is not a focusable element", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		render(Tooltip, {
			props: { content: "Add to favorites", children: nonFocusableSnippet() },
		});
		await tick();

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0][0]).toContain("[Tooltip]");
		warn.mockRestore();
	});

	it("does not warn when the first child is a real focusable element", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		render(Tooltip, {
			props: { content: "Add to favorites", children: triggerSnippet() },
		});
		await tick();

		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});

	it("merges the class prop onto the trigger wrapper", () => {
		const { container } = render(Tooltip, {
			props: { content: "Add to favorites", children: triggerSnippet(), class: "ml-2" },
		});
		const wrapper = container.querySelector(".ft-tooltip-trigger");
		expect(wrapper?.className).toContain("ml-2");
	});

	it("binds the trigger wrapper element via ref", () => {
		let ref: HTMLElement | null = null;
		const { container } = render(Tooltip, {
			props: {
				content: "Add to favorites",
				children: triggerSnippet(),
				get ref() {
					return ref;
				},
				set ref(value: HTMLElement | null) {
					ref = value;
				},
			},
		});
		expect(ref).toBe(container.querySelector(".ft-tooltip-trigger"));
	});
});
