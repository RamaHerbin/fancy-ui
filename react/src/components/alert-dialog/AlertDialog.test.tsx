import { useState } from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

import { AlertDialog } from "./AlertDialog.js";
import { __dismissableLayerCount, attachDismissable } from "../../internals/dismissable.js";

// The source suite's assertions transposed one for one. Its `createRawSnippet`
// harness becomes plain JSX; its `tick()` awaits disappear (React's own
// `fireEvent`/`act` flush synchronously); the helpers that dispatch native
// document events gain the `act` wrapper React needs to see the state update
// they schedule.

/**
 * jsdom has no `inert` IDL property, so `el.inert = true` would otherwise be a
 * plain expando reflecting to no attribute — a test reading `.inert` back
 * would pass even if the real browser behaviour (an `inert` ATTRIBUTE) was
 * never touched. Same shim `Dialog.test.tsx` installs, guarded so it is a
 * no-op the moment jsdom ships the real property.
 */
if (!("inert" in HTMLElement.prototype)) {
	Object.defineProperty(HTMLElement.prototype, "inert", {
		configurable: true,
		get(this: HTMLElement) {
			return this.hasAttribute("inert");
		},
		set(this: HTMLElement, value: boolean) {
			if (value) this.setAttribute("inert", "");
			else this.removeAttribute("inert");
		},
	});
}

/** See Dialog.test.tsx's identical helper — `prefersReducedMotion()` re-reads
 * `window.matchMedia` on every call, so a wholesale override is enough. */
function stubReducedMotion(matches: boolean) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	}));
}

function panel(): HTMLElement | null {
	return document.body.querySelector('[role="alertdialog"]');
}

function scrim(): HTMLElement | null {
	return document.body.querySelector(".ft-dialog-scrim");
}

function buttons(): HTMLButtonElement[] {
	return Array.from(panel()?.querySelectorAll("button") ?? []);
}

function cancelButton(): HTMLButtonElement {
	return buttons().find((b) => b.textContent?.trim() === "Cancel")!;
}

function confirmButton(): HTMLButtonElement {
	return buttons().find((b) => b.textContent?.trim() === "Delete")!;
}

/**
 * Wrapped in a SYNCHRONOUS `act`: the listener is a native document one, so
 * the state update it schedules has to be flushed for the next assertion to
 * see it — but a synchronous `act` does not drain microtasks, which is what
 * keeps an exit leg in flight across the assertions that need it there.
 */
function pressEscape() {
	act(() => {
		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
		);
	});
}

function pointerDownOn(target: HTMLElement) {
	const init = { bubbles: true, cancelable: true };
	// The jsdom version this package pins does not implement `PointerEvent`.
	// A `MouseEvent` of the same type carries everything the handler reads
	// (`type` and `target`), so the assertions are unaffected.
	const event =
		typeof PointerEvent === "undefined"
			? new MouseEvent("pointerdown", init)
			: new PointerEvent("pointerdown", init);
	act(() => {
		target.dispatchEvent(event);
	});
}

/**
 * Drains an exit leg to completion. The animation stub finishes on a
 * MICROTASK, so a settled leg is a couple of turns away; an async `act`
 * crosses a macrotask boundary and flushes the React updates the finish
 * schedules. Every test that leaves a leg in flight ends with this — a leg
 * that settles after the test body returns updates state outside `act`.
 */
const settleLegs = () => act(async () => {});

function trigger(): HTMLButtonElement {
	return document.body.querySelector<HTMLButtonElement>('[data-testid="open-trigger"]')!;
}

const TRIGGER = (
	<button type="button" data-testid="open-trigger">
		Delete
	</button>
);

describe("AlertDialog", () => {
	beforeEach(() => {
		// The scroll lock restores the page offset with `window.scrollTo`, which
		// jsdom does not implement — unmocked it floods the run with
		// "Not implemented" noise on every release.
		vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	});

	afterEach(() => {
		cleanup();
		expect(__dismissableLayerCount()).toBe(0);
		document.body.innerHTML = "";
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("renders nothing when closed", () => {
		render(<AlertDialog title="Delete project" />);
		expect(panel()).toBeNull();
	});

	it("renders role=alertdialog with aria-modal when open", () => {
		render(<AlertDialog open title="Delete project" />);

		const el = panel();
		expect(el).toBeTruthy();
		expect(el?.getAttribute("aria-modal")).toBe("true");
	});

	it("points aria-labelledby and aria-describedby at ids that exist", () => {
		render(<AlertDialog open title="Delete project?" description="This cannot be undone." />);

		const el = panel()!;
		const labelledby = el.getAttribute("aria-labelledby")!;
		const describedby = el.getAttribute("aria-describedby")!;
		expect(document.getElementById(labelledby)?.textContent).toBe("Delete project?");
		expect(document.getElementById(describedby)?.textContent).toBe("This cannot be undone.");
	});

	it("omits aria-labelledby and aria-describedby entirely when title/description are not given", () => {
		render(<AlertDialog open />);

		const el = panel()!;
		expect(el.hasAttribute("aria-labelledby")).toBe(false);
		expect(el.hasAttribute("aria-describedby")).toBe(false);
	});

	it("renders the default Cancel/Confirm labels", () => {
		render(<AlertDialog open title="Delete project" />);

		const labels = buttons().map((b) => b.textContent?.trim());
		expect(labels).toContain("Cancel");
		expect(labels).toContain("Confirm");
	});

	it("renders custom confirmLabel/cancelLabel", () => {
		render(<AlertDialog open title="Delete project" confirmLabel="Delete" cancelLabel="Keep" />);

		const labels = buttons().map((b) => b.textContent?.trim());
		expect(labels).toContain("Delete");
		expect(labels).toContain("Keep");
	});

	it("focuses the Cancel button by default, not Confirm", () => {
		render(<AlertDialog open title="Delete project" confirmLabel="Delete" />);

		expect(document.activeElement).toBe(cancelButton());
	});

	it("honours an explicit initialFocus over the default Cancel focus", () => {
		const input = document.createElement("input");
		document.body.appendChild(input);

		render(<AlertDialog open title="Delete project" confirmLabel="Delete" initialFocus={input} />);

		expect(document.activeElement).toBe(input);
	});

	it("activating Cancel calls onCancel and closes, not onConfirm", async () => {
		const onCancel = vi.fn();
		const onConfirm = vi.fn();
		const onOpenChange = vi.fn();
		render(
			<AlertDialog
				open
				title="Delete project"
				confirmLabel="Delete"
				onCancel={onCancel}
				onConfirm={onConfirm}
				onOpenChange={onOpenChange}
			/>
		);

		fireEvent.click(cancelButton());
		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onConfirm).not.toHaveBeenCalled();
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await settleLegs();
	});

	it("activating Confirm calls onConfirm and closes, not onCancel", async () => {
		const onCancel = vi.fn();
		const onConfirm = vi.fn();
		const onOpenChange = vi.fn();
		render(
			<AlertDialog
				open
				title="Delete project"
				confirmLabel="Delete"
				onCancel={onCancel}
				onConfirm={onConfirm}
				onOpenChange={onOpenChange}
			/>
		);

		fireEvent.click(confirmButton());
		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(onCancel).not.toHaveBeenCalled();
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await settleLegs();
	});

	// The decision this component's README documents and defends: a destructive
	// confirmation the user can dismiss by missing is not a confirmation, so
	// outside click is disabled unconditionally — there is no prop that turns
	// it back on.
	it("never closes on an outside click, even though Dialog's default is to allow it", () => {
		const onOpenChange = vi.fn();
		render(<AlertDialog open title="Delete project" onOpenChange={onOpenChange} />);

		pointerDownOn(scrim()!);
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(panel()).toBeTruthy();
	});

	// Escape is treated as the keyboard equivalent of Cancel — an explicit,
	// deliberate gesture, unlike an outside click, so it fires onCancel (not
	// onConfirm) and closes.
	it("closes on Escape and calls onCancel, treating it as the keyboard Cancel", async () => {
		const onCancel = vi.fn();
		const onConfirm = vi.fn();
		const onOpenChange = vi.fn();
		render(
			<AlertDialog
				open
				title="Delete project"
				onCancel={onCancel}
				onConfirm={onConfirm}
				onOpenChange={onOpenChange}
			/>
		);

		pressEscape();
		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onConfirm).not.toHaveBeenCalled();
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await settleLegs();
	});

	it("opens on trigger activation and returns focus to the trigger on close", async () => {
		const onOpenChange = vi.fn();
		// `open` starts false and is never written back by this harness — the
		// component's own internal copy is what flips (and re-renders this same
		// instance) when the trigger is clicked, exactly as it would for a
		// caller who only passed `onOpenChange`.
		render(
			<AlertDialog
				open={false}
				onOpenChange={onOpenChange}
				title="Delete project"
				trigger={TRIGGER}
			/>
		);

		trigger().focus();
		fireEvent.click(trigger());

		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(panel()).toBeTruthy();

		fireEvent.click(cancelButton());

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(document.activeElement).toBe(trigger());
		await settleLegs();
	});

	it("only the top-most stacked layer reacts to Escape — a nested overlay takes the first press", async () => {
		const onCancel = vi.fn();
		render(<AlertDialog open title="Delete project" onCancel={onCancel} />);

		const nested = document.createElement("div");
		document.body.appendChild(nested);
		const onNestedDismiss = vi.fn();
		const nestedHandle = attachDismissable(nested, { onDismiss: onNestedDismiss });

		pressEscape();
		expect(onNestedDismiss).toHaveBeenCalledTimes(1);
		expect(onCancel).not.toHaveBeenCalled();

		nestedHandle.destroy();
		pressEscape();
		expect(onCancel).toHaveBeenCalledTimes(1);
		await settleLegs();
	});

	it("locks the page scroll while open and releases it on close", async () => {
		const { rerender } = render(<AlertDialog open title="Delete project" />);
		// Acquire stays synchronous — the lock lands in a layout effect the
		// moment the surface mounts.
		expect(document.body.style.position).toBe("fixed");

		rerender(<AlertDialog open={false} title="Delete project" />);
		// Release is not: it is scoped to the surface's MOUNT, which the
		// presence group holds for the length of the exit, so the page stays
		// locked until the backdrop is actually gone.
		await waitFor(() => expect(document.body.style.position).toBe(""));
	});

	// The close protocol's own guards, mirroring Dialog's. `onCancel` is the
	// one that matters most here: Escape routes through the same handler the
	// Cancel button calls, so a repeated Escape during the fade must not read
	// as the user cancelling twice.
	it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
		render(<AlertDialog open title="Delete project" />);
		expect(panel()!.getAttribute("data-state")).toBe("open");

		pressEscape();

		const closing = panel();
		expect(closing).toBeTruthy();
		expect(closing!.getAttribute("data-state")).toBe("closing");
		expect(closing!.inert).toBe(true);

		await waitFor(() => expect(panel()).toBeNull());
		expect(scrim()).toBeNull();
	});

	it("calls onCancel exactly once when Escape is pressed twice during the exit", async () => {
		const onCancel = vi.fn();
		const onOpenChange = vi.fn();
		render(
			<AlertDialog open title="Delete project" onCancel={onCancel} onOpenChange={onOpenChange} />
		);

		pressEscape();
		expect(panel()).toBeTruthy(); // still fading

		pressEscape();
		pressEscape();

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		await settleLegs();
	});

	it("closes synchronously and never animates when the user asked for reduced motion", () => {
		stubReducedMotion(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(<AlertDialog open title="Delete project" />);
		expect(panel()).toBeTruthy();

		pressEscape();

		expect(panel()).toBeNull();
		expect(scrim()).toBeNull();
		expect(animateSpy).not.toHaveBeenCalled();
	});

	it("round-trips through a controlled open + onOpenChange pair", async () => {
		// The React spelling of the source's `bind:open`: the caller owns the
		// value and writes it back from `onOpenChange`.
		const seen: boolean[] = [];
		function Controlled() {
			const [open, setOpen] = useState(true);
			seen.push(open);
			return <AlertDialog open={open} onOpenChange={setOpen} title="Delete project" />;
		}
		render(<Controlled />);
		expect(panel()).toBeTruthy();

		fireEvent.click(cancelButton());
		expect(seen.at(-1)).toBe(false);
		await settleLegs();
	});

	it("merges the class prop onto the panel", () => {
		render(<AlertDialog open title="Delete project" className="mt-4" />);
		expect(panel()!.className).toContain("mt-4");
	});

	it("exposes the panel element through the forwarded ref", () => {
		const ref = { current: null as HTMLDivElement | null };
		render(<AlertDialog ref={ref} open title="Delete project" />);
		expect(ref.current).toBe(panel());
	});
});
