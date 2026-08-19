import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Dialog from "./Dialog.svelte";
import { dismissable } from "../_internals/dismissable.js";

function panel(): HTMLElement | null {
	return document.body.querySelector('[role="dialog"]');
}

function scrim(): HTMLElement | null {
	return document.body.querySelector(".ft-dialog-scrim");
}

function closeButton(): HTMLButtonElement | null {
	return panel()?.querySelector('button[aria-label="Close"]') ?? null;
}

function pressEscape() {
	document.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
	);
}

function pointerDownOn(target: HTMLElement) {
	target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
}

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

describe("Dialog", () => {
	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
	});

	it("renders nothing when closed", () => {
		render(Dialog, { props: { title: "Invite" } });
		expect(panel()).toBeNull();
	});

	it("renders role=dialog with aria-modal when open", async () => {
		render(Dialog, { props: { open: true, title: "Invite" } });
		await tick();

		const el = panel();
		expect(el).toBeTruthy();
		expect(el?.getAttribute("aria-modal")).toBe("true");
	});

	it("points aria-labelledby and aria-describedby at ids that exist", async () => {
		render(Dialog, {
			props: { open: true, title: "Invite a member", description: "Send an email invite." },
		});
		await tick();

		const el = panel()!;
		const labelledby = el.getAttribute("aria-labelledby")!;
		const describedby = el.getAttribute("aria-describedby")!;
		expect(document.getElementById(labelledby)?.textContent).toBe("Invite a member");
		expect(document.getElementById(describedby)?.textContent).toBe("Send an email invite.");
	});

	it("omits aria-labelledby and aria-describedby entirely when title/description are not given", async () => {
		render(Dialog, { props: { open: true } });
		await tick();

		const el = panel()!;
		expect(el.hasAttribute("aria-labelledby")).toBe(false);
		expect(el.hasAttribute("aria-describedby")).toBe(false);
	});

	it("gives the close button a real accessible name, not just the glyph", async () => {
		render(Dialog, { props: { open: true, title: "Invite" } });
		await tick();

		const btn = closeButton()!;
		expect(btn.getAttribute("aria-label")).toBe("Close");
	});

	it("closes and fires onOpenChange(false) when the close button is activated", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, { props: { open: true, title: "Invite", onOpenChange } });
		await tick();

		await fireEvent.click(closeButton()!);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("closes on Escape by default", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, { props: { open: true, title: "Invite", onOpenChange } });
		await tick();

		pressEscape();
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("does not close on Escape when dismissible is false", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, {
			props: { open: true, title: "Invite", dismissible: false, onOpenChange },
		});
		await tick();

		pressEscape();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("closes on an outside click by default", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, { props: { open: true, title: "Invite", onOpenChange } });
		await tick();

		pointerDownOn(scrim()!);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("does not close on an outside click when dismissible is false", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, {
			props: { open: true, title: "Invite", dismissible: false, onOpenChange },
		});
		await tick();

		pointerDownOn(scrim()!);
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("the close button still works when dismissible is false", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, {
			props: { open: true, title: "Invite", dismissible: false, onOpenChange },
		});
		await tick();

		await fireEvent.click(closeButton()!);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("moves focus inside the panel on open", async () => {
		render(Dialog, {
			props: {
				open: true,
				title: "Invite",
				children: snippet('<input data-testid="email" />'),
			},
		});
		await tick();

		expect(panel()!.contains(document.activeElement)).toBe(true);
	});

	it("honours an explicit initialFocus over the default first-focusable", async () => {
		const input = document.createElement("input");
		input.setAttribute("data-testid", "seed");
		document.body.appendChild(input);

		render(Dialog, {
			props: {
				open: true,
				title: "Invite",
				initialFocus: input,
				children: snippet('<input data-testid="email" />'),
			},
		});
		await tick();

		expect(document.activeElement).toBe(input);
	});

	it("opens on trigger activation and returns focus to the trigger on close", async () => {
		const onOpenChange = vi.fn();
		// `open` starts false and is never bound back to this harness — the
		// dialog's own internal $bindable copy is what actually flips (and
		// re-renders this same instance) when the trigger is clicked, exactly
		// as it would for a caller who only passed `onOpenChange` and never
		// `bind:open`.
		render(Dialog, {
			props: {
				open: false,
				onOpenChange,
				title: "Invite",
				trigger: snippet('<button type="button" data-testid="open-trigger">Invite</button>'),
			},
		});

		const trigger = document.body.querySelector<HTMLButtonElement>('[data-testid="open-trigger"]')!;
		trigger.focus();
		await fireEvent.click(trigger);
		await tick();

		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(panel()).toBeTruthy();

		pressEscape();
		await tick();

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(document.activeElement).toBe(trigger);
	});

	// `focus-trap.ts`'s `previouslyFocused` is a raw reference captured once
	// at mount — if the trigger (and the wrapper Dialog rendered it in)
	// leaves the document while the dialog stays open, `.focus()` on it
	// would silently do nothing. `fallbackFocus` exists to catch that; here
	// the trigger is also `fallbackFocus`'s own target, so removing it
	// exercises the chain's final step, not just its second one.
	it("falls back to document.body when the trigger has been removed from the DOM while the dialog was open", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, {
			props: {
				open: false,
				onOpenChange,
				title: "Invite",
				trigger: snippet('<button type="button" data-testid="open-trigger">Invite</button>'),
			},
		});

		const trigger = document.body.querySelector<HTMLButtonElement>('[data-testid="open-trigger"]')!;
		await fireEvent.click(trigger);
		await tick();
		expect(panel()).toBeTruthy();

		// Simulates a re-render elsewhere on the page removing the row this
		// trigger lived in — e.g. a reordering `{#each}` — while the dialog
		// it opened is still open.
		trigger.parentElement!.remove();

		await fireEvent.click(closeButton()!);
		await tick();

		expect(document.activeElement).toBe(document.body);
	});

	it("excludes the trigger from outside-click dismissal, so clicking it again while open does not close it", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, {
			props: {
				open: false,
				onOpenChange,
				title: "Invite",
				trigger: snippet('<button type="button" data-testid="open-trigger">Invite</button>'),
			},
		});

		const trigger = document.body.querySelector<HTMLButtonElement>('[data-testid="open-trigger"]')!;
		await fireEvent.click(trigger);
		await tick();
		expect(panel()).toBeTruthy();

		onOpenChange.mockClear();
		pointerDownOn(trigger);
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(panel()).toBeTruthy();
	});

	it("only the top-most stacked layer reacts to Escape — a nested overlay takes the first press, the dialog the second", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, { props: { open: true, title: "Invite", onOpenChange } });
		await tick();

		// Stand-in for a Popover opened from inside this dialog: another node
		// using the same shared `dismissable` layer stack, mounted after the
		// dialog's own panel.
		const nested = document.createElement("div");
		document.body.appendChild(nested);
		const onNestedDismiss = vi.fn();
		const nestedAction = dismissable(nested, { onDismiss: onNestedDismiss });

		pressEscape();
		expect(onNestedDismiss).toHaveBeenCalledTimes(1);
		expect(onOpenChange).not.toHaveBeenCalled();

		nestedAction?.destroy?.();
		pressEscape();
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("locks the page scroll while open and releases it on close", async () => {
		const { rerender } = render(Dialog, { props: { open: true, title: "Invite" } });
		await tick();
		expect(document.body.style.position).toBe("fixed");

		await rerender({ open: false, title: "Invite" });
		await tick();
		expect(document.body.style.position).toBe("");
	});

	it("round-trips through bind:open", async () => {
		let open = true;
		render(Dialog, {
			props: {
				title: "Invite",
				get open() {
					return open;
				},
				set open(value: boolean) {
					open = value;
				},
			},
		});
		await tick();
		expect(panel()).toBeTruthy();

		await fireEvent.click(closeButton()!);
		expect(open).toBe(false);
	});

	it("works with onOpenChange alone, no bind:open", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, { props: { open: true, title: "Invite", onOpenChange } });
		await tick();

		await fireEvent.click(closeButton()!);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	// Distinct from the two cases above: no `open` prop at all, so this pins
	// the `$bindable(false)` default itself — the two tests above both pass
	// `open: true` explicitly and would not notice if the default silently
	// changed to `true`.
	it("works fully uncontrolled, with no open prop given, relying on the false default", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, {
			props: {
				title: "Invite",
				onOpenChange,
				trigger: snippet('<button type="button" data-testid="open-trigger">Invite</button>'),
			},
		});
		expect(panel()).toBeNull();

		const trigger = document.body.querySelector<HTMLButtonElement>('[data-testid="open-trigger"]')!;
		await fireEvent.click(trigger);
		await tick();

		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(panel()).toBeTruthy();
	});

	it("merges the class prop onto the panel", async () => {
		render(Dialog, { props: { open: true, title: "Invite", class: "mt-4" } });
		await tick();
		expect(panel()!.className).toContain("mt-4");
	});

	it("binds the panel element via ref", async () => {
		let ref: HTMLDivElement | null = null;
		render(Dialog, {
			props: {
				open: true,
				title: "Invite",
				get ref() {
					return ref;
				},
				set ref(value: HTMLDivElement | null) {
					ref = value;
				},
			},
		});
		await tick();
		expect(ref).toBe(panel());
	});
});
