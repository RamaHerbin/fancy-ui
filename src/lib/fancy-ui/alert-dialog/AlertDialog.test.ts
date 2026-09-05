import { render, cleanup, fireEvent, waitFor } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import AlertDialog from "./AlertDialog.svelte";
import { dismissable } from "../_internals/dismissable.js";
import { sound } from "../sound/sound.svelte.js";

/** See Dialog.test.ts's identical helper — `prefersReducedMotion()` re-reads
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

describe("AlertDialog", () => {
	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("renders nothing when closed", () => {
		render(AlertDialog, { props: { title: "Delete project" } });
		expect(panel()).toBeNull();
	});

	it("renders role=alertdialog with aria-modal when open", async () => {
		render(AlertDialog, { props: { open: true, title: "Delete project" } });
		await tick();

		const el = panel();
		expect(el).toBeTruthy();
		expect(el?.getAttribute("aria-modal")).toBe("true");
	});

	it("points aria-labelledby and aria-describedby at ids that exist", async () => {
		render(AlertDialog, {
			props: {
				open: true,
				title: "Delete project?",
				description: "This cannot be undone.",
			},
		});
		await tick();

		const el = panel()!;
		const labelledby = el.getAttribute("aria-labelledby")!;
		const describedby = el.getAttribute("aria-describedby")!;
		expect(document.getElementById(labelledby)?.textContent).toBe("Delete project?");
		expect(document.getElementById(describedby)?.textContent).toBe("This cannot be undone.");
	});

	it("omits aria-labelledby and aria-describedby entirely when title/description are not given", async () => {
		render(AlertDialog, { props: { open: true } });
		await tick();

		const el = panel()!;
		expect(el.hasAttribute("aria-labelledby")).toBe(false);
		expect(el.hasAttribute("aria-describedby")).toBe(false);
	});

	it("renders the default Cancel/Confirm labels", async () => {
		render(AlertDialog, { props: { open: true, title: "Delete project" } });
		await tick();

		const labels = buttons().map((b) => b.textContent?.trim());
		expect(labels).toContain("Cancel");
		expect(labels).toContain("Confirm");
	});

	it("renders custom confirmLabel/cancelLabel", async () => {
		render(AlertDialog, {
			props: { open: true, title: "Delete project", confirmLabel: "Delete", cancelLabel: "Keep" },
		});
		await tick();

		const labels = buttons().map((b) => b.textContent?.trim());
		expect(labels).toContain("Delete");
		expect(labels).toContain("Keep");
	});

	it("focuses the Cancel button by default, not Confirm", async () => {
		render(AlertDialog, {
			props: { open: true, title: "Delete project", confirmLabel: "Delete" },
		});
		await tick();

		expect(document.activeElement).toBe(cancelButton());
	});

	it("honours an explicit initialFocus over the default Cancel focus", async () => {
		const input = document.createElement("input");
		document.body.appendChild(input);

		render(AlertDialog, {
			props: { open: true, title: "Delete project", confirmLabel: "Delete", initialFocus: input },
		});
		await tick();

		expect(document.activeElement).toBe(input);
	});

	it("activating Cancel calls onCancel and closes, not onConfirm", async () => {
		const onCancel = vi.fn();
		const onConfirm = vi.fn();
		const onOpenChange = vi.fn();
		render(AlertDialog, {
			props: {
				open: true,
				title: "Delete project",
				confirmLabel: "Delete",
				onCancel,
				onConfirm,
				onOpenChange,
			},
		});
		await tick();

		await fireEvent.click(cancelButton());
		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onConfirm).not.toHaveBeenCalled();
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("activating Confirm calls onConfirm and closes, not onCancel", async () => {
		const onCancel = vi.fn();
		const onConfirm = vi.fn();
		const onOpenChange = vi.fn();
		render(AlertDialog, {
			props: {
				open: true,
				title: "Delete project",
				confirmLabel: "Delete",
				onCancel,
				onConfirm,
				onOpenChange,
			},
		});
		await tick();

		await fireEvent.click(confirmButton());
		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(onCancel).not.toHaveBeenCalled();
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	// The decision this wave's README documents and defends: a destructive
	// confirmation the user can dismiss by missing is not a confirmation, so
	// outside click is disabled unconditionally — there is no prop that turns
	// it back on.
	it("never closes on an outside click, even though Dialog's default is to allow it", async () => {
		const onOpenChange = vi.fn();
		render(AlertDialog, {
			props: { open: true, title: "Delete project", onOpenChange },
		});
		await tick();

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
		render(AlertDialog, {
			props: { open: true, title: "Delete project", onCancel, onConfirm, onOpenChange },
		});
		await tick();

		pressEscape();
		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onConfirm).not.toHaveBeenCalled();
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("opens on trigger activation and returns focus to the trigger on close", async () => {
		const onOpenChange = vi.fn();
		render(AlertDialog, {
			props: {
				open: false,
				onOpenChange,
				title: "Delete project",
				trigger: snippet('<button type="button" data-testid="open-trigger">Delete</button>'),
			},
		});

		const trigger = document.body.querySelector<HTMLButtonElement>('[data-testid="open-trigger"]')!;
		trigger.focus();
		await fireEvent.click(trigger);
		await tick();

		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(panel()).toBeTruthy();

		await fireEvent.click(cancelButton());
		await tick();

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(document.activeElement).toBe(trigger);
	});

	it("only the top-most stacked layer reacts to Escape — a nested overlay takes the first press", async () => {
		const onCancel = vi.fn();
		render(AlertDialog, { props: { open: true, title: "Delete project", onCancel } });
		await tick();

		const nested = document.createElement("div");
		document.body.appendChild(nested);
		const onNestedDismiss = vi.fn();
		const nestedAction = dismissable(nested, { onDismiss: onNestedDismiss });

		pressEscape();
		expect(onNestedDismiss).toHaveBeenCalledTimes(1);
		expect(onCancel).not.toHaveBeenCalled();

		nestedAction?.destroy?.();
		pressEscape();
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it("locks the page scroll while open and releases it on close", async () => {
		const { rerender } = render(AlertDialog, { props: { open: true, title: "Delete project" } });
		await tick();
		// Acquire stays synchronous — `use:scrollLock` runs at mount.
		expect(document.body.style.position).toBe("fixed");

		await rerender({ open: false, title: "Delete project" });
		// Release is not: the action's `destroy()` is delayed by the exit, so
		// the page stays locked until the backdrop is actually gone.
		await waitFor(() => expect(document.body.style.position).toBe(""));
	});

	// The close protocol's own guards, mirroring Dialog's. `onCancel` is the
	// one that matters most here: Escape routes through the same handler the
	// Cancel button calls, so a repeated Escape during the fade must not read
	// as the user cancelling twice.
	it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
		render(AlertDialog, { props: { open: true, title: "Delete project" } });
		await tick();
		expect(panel()!.getAttribute("data-state")).toBe("open");

		pressEscape();
		await tick();

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
		render(AlertDialog, {
			props: { open: true, title: "Delete project", onCancel, onOpenChange },
		});
		await tick();

		pressEscape();
		await tick();
		expect(panel()).toBeTruthy(); // still fading

		pressEscape();
		pressEscape();
		await tick();

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledTimes(1);
	});

	it("closes synchronously and never animates when the user asked for reduced motion", async () => {
		stubReducedMotion(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(AlertDialog, { props: { open: true, title: "Delete project" } });
		await tick();
		expect(panel()).toBeTruthy();

		pressEscape();
		await tick();

		expect(panel()).toBeNull();
		expect(scrim()).toBeNull();
		expect(animateSpy).not.toHaveBeenCalled();
	});

	it("round-trips through bind:open", async () => {
		let open = true;
		render(AlertDialog, {
			props: {
				title: "Delete project",
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

		await fireEvent.click(cancelButton());
		expect(open).toBe(false);
	});

	it("merges the class prop onto the panel", async () => {
		render(AlertDialog, { props: { open: true, title: "Delete project", class: "mt-4" } });
		await tick();
		expect(panel()!.className).toContain("mt-4");
	});

	it("binds the panel element via ref", async () => {
		let ref: HTMLDivElement | null = null;
		render(AlertDialog, {
			props: {
				open: true,
				title: "Delete project",
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

	describe("sound", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays open exactly once when the trigger opens the prompt", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(AlertDialog, {
				props: {
					sound: true,
					title: "Delete project",
					trigger: snippet('<button type="button" data-testid="open-trigger">Delete</button>'),
				},
			});

			const trigger = document.body.querySelector<HTMLButtonElement>(
				'[data-testid="open-trigger"]'
			)!;
			await fireEvent.click(trigger);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open");
		});

		it("plays select exactly once on Confirm, never close for the same activation", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(AlertDialog, {
				props: { sound: true, open: true, title: "Delete project", confirmLabel: "Delete" },
			});
			await tick();

			await fireEvent.click(confirmButton());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("plays close exactly once on Cancel, and close exactly once on Escape", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { rerender } = render(AlertDialog, {
				props: { sound: true, open: true, title: "Delete project" },
			});
			await tick();

			await fireEvent.click(cancelButton());
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");

			play.mockClear();
			await rerender({ sound: true, open: true, title: "Delete project" });
			await tick();
			pressEscape();
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(AlertDialog, {
				props: { open: true, title: "Delete project", confirmLabel: "Delete" },
			});
			await tick();

			await fireEvent.click(confirmButton());

			expect(play).not.toHaveBeenCalled();
		});

		// The internal Cancel/Confirm Buttons never receive `sound` — a single
		// activation must play exactly one cue, not the alert dialog's own plus
		// a doubled Button `press`.
		it("never double-fires — activating Confirm plays exactly one cue total", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(AlertDialog, {
				props: { sound: true, open: true, title: "Delete project", confirmLabel: "Delete" },
			});
			await tick();

			await fireEvent.click(confirmButton());

			expect(play).toHaveBeenCalledTimes(1);
		});

		it("plays close exactly once when Escape is pressed twice during the exit", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(AlertDialog, { props: { sound: true, open: true, title: "Delete project" } });
			await tick();

			pressEscape();
			await tick();
			expect(panel()).toBeTruthy(); // still fading

			pressEscape();
			pressEscape();
			await tick();

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});
	});
});
