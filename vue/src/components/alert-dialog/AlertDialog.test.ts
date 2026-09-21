import { cleanup, fireEvent, render, waitFor } from "@testing-library/vue";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import AlertDialog from "./AlertDialog.vue";
import { dismissable } from "../../internals/dismissable.js";
import { sound } from "../../sound/sound.js";

/**
 * Transposed case for case from the source component's suite. Four shapes
 * changed and nothing else did:
 *
 * - The source's `trigger` snippet is a slot here, so `createRawSnippet(...)`
 *   becomes a template string in `slots`.
 * - `tick()` becomes `nextTick()`.
 * - The bindable `open` is `v-model:open`, so the round-trip case passes an
 *   `onUpdate:open` listener instead of a getter/setter pair.
 * - The bindable `ref` is exposed on the instance, so the last case mounts and
 *   reads `wrapper.vm.ref` rather than binding a local.
 *
 * Two fixtures also changed, each marked at its call site: this package's jsdom
 * has no `PointerEvent`, and the one source case that re-opens the same
 * instance with a `rerender` needs a fresh mount here instead.
 *
 * No `inert` shim, deliberately (the sibling Dialog suite makes the same call):
 * jsdom implements no `inert` IDL property, so the exit case asserts the
 * ATTRIBUTE the presence clock actually writes.
 */

/** See the sibling Dialog suite's identical helper — `prefersReducedMotion()`
 * re-reads `window.matchMedia` on every call, so a wholesale override is
 * enough. */
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

/**
 * Drains a leg to completion. The shared `animate` stub finishes each animation
 * on a microtask and the sampler chains a leading dummy into the real
 * animation, so a settled leg is two turns away; crossing a macrotask boundary
 * drains the whole chain, and the trailing `nextTick()` flushes the render the
 * finish scheduled.
 */
const settleLegs = async () => {
	await new Promise<void>((resolve) => setTimeout(resolve, 0));
	await nextTick();
};

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
	// This package's jsdom version does not implement PointerEvent (the source
	// suite's jsdom does); the dismiss layer only reads `event.target`, so a
	// same-typed MouseEvent is an equivalent stand-in — the same substitution
	// the sibling Dialog suite makes.
	const PointerDownCtor = typeof PointerEvent !== "undefined" ? PointerEvent : MouseEvent;
	target.dispatchEvent(new PointerDownCtor("pointerdown", { bubbles: true, cancelable: true }));
}

const TRIGGER_SLOT = '<button type="button" data-testid="open-trigger">Delete</button>';

function triggerNode(): HTMLButtonElement {
	return document.body.querySelector<HTMLButtonElement>('[data-testid="open-trigger"]')!;
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
		await nextTick();

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
		await nextTick();

		const el = panel()!;
		const labelledby = el.getAttribute("aria-labelledby")!;
		const describedby = el.getAttribute("aria-describedby")!;
		expect(document.getElementById(labelledby)?.textContent?.trim()).toBe("Delete project?");
		expect(document.getElementById(describedby)?.textContent?.trim()).toBe(
			"This cannot be undone."
		);
	});

	it("omits aria-labelledby and aria-describedby entirely when title/description are not given", async () => {
		render(AlertDialog, { props: { open: true } });
		await nextTick();

		const el = panel()!;
		expect(el.hasAttribute("aria-labelledby")).toBe(false);
		expect(el.hasAttribute("aria-describedby")).toBe(false);
	});

	it("renders the default Cancel/Confirm labels", async () => {
		render(AlertDialog, { props: { open: true, title: "Delete project" } });
		await nextTick();

		const labels = buttons().map((b) => b.textContent?.trim());
		expect(labels).toContain("Cancel");
		expect(labels).toContain("Confirm");
	});

	it("renders custom confirmLabel/cancelLabel", async () => {
		render(AlertDialog, {
			props: { open: true, title: "Delete project", confirmLabel: "Delete", cancelLabel: "Keep" },
		});
		await nextTick();

		const labels = buttons().map((b) => b.textContent?.trim());
		expect(labels).toContain("Delete");
		expect(labels).toContain("Keep");
	});

	it("focuses the Cancel button by default, not Confirm", async () => {
		render(AlertDialog, {
			props: { open: true, title: "Delete project", confirmLabel: "Delete" },
		});
		await nextTick();

		expect(document.activeElement).toBe(cancelButton());
	});

	it("honours an explicit initialFocus over the default Cancel focus", async () => {
		const input = document.createElement("input");
		document.body.appendChild(input);

		render(AlertDialog, {
			props: { open: true, title: "Delete project", confirmLabel: "Delete", initialFocus: input },
		});
		await nextTick();

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
		await nextTick();

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
		await nextTick();

		await fireEvent.click(confirmButton());
		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(onCancel).not.toHaveBeenCalled();
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	// The decision the source README documents and defends: a destructive
	// confirmation the user can dismiss by missing is not a confirmation, so
	// outside click is disabled unconditionally — there is no prop that turns
	// it back on.
	it("never closes on an outside click, even though Dialog's default is to allow it", async () => {
		const onOpenChange = vi.fn();
		render(AlertDialog, {
			props: { open: true, title: "Delete project", onOpenChange },
		});
		await nextTick();

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
		await nextTick();

		pressEscape();
		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onConfirm).not.toHaveBeenCalled();
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("opens on trigger activation and returns focus to the trigger on close", async () => {
		const onOpenChange = vi.fn();
		render(AlertDialog, {
			props: { open: false, onOpenChange, title: "Delete project" },
			slots: { trigger: TRIGGER_SLOT },
		});

		const trigger = triggerNode();
		trigger.focus();
		await fireEvent.click(trigger);
		await nextTick();

		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(panel()).toBeTruthy();

		await fireEvent.click(cancelButton());
		await nextTick();

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(document.activeElement).toBe(trigger);
	});

	it("only the top-most stacked layer reacts to Escape — a nested overlay takes the first press", async () => {
		const onCancel = vi.fn();
		render(AlertDialog, { props: { open: true, title: "Delete project", onCancel } });
		await nextTick();

		const nested = document.createElement("div");
		document.body.appendChild(nested);
		const onNestedDismiss = vi.fn();
		const nestedHandle = dismissable(nested, { onDismiss: onNestedDismiss });

		pressEscape();
		expect(onNestedDismiss).toHaveBeenCalledTimes(1);
		expect(onCancel).not.toHaveBeenCalled();

		nestedHandle?.destroy?.();
		pressEscape();
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it("locks the page scroll while open and releases it on close", async () => {
		const { rerender } = render(AlertDialog, { props: { open: true, title: "Delete project" } });
		await nextTick();
		// Acquire stays synchronous — the lock is taken at mount.
		expect(document.body.style.position).toBe("fixed");

		await rerender({ open: false, title: "Delete project" });
		// Release is not: it lands at the END of the exit, so the page stays
		// locked until the backdrop is actually gone.
		await waitFor(() => expect(document.body.style.position).toBe(""));
	});

	// The close protocol's own guards, mirroring Dialog's. `onCancel` is the
	// one that matters most here: Escape routes through the same handler the
	// Cancel button calls, so a repeated Escape during the fade must not read
	// as the user cancelling twice.
	it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
		render(AlertDialog, { props: { open: true, title: "Delete project" } });
		await nextTick();
		expect(panel()!.getAttribute("data-state")).toBe("open");

		pressEscape();
		await nextTick();

		const closing = panel();
		expect(closing).toBeTruthy();
		expect(closing!.getAttribute("data-state")).toBe("closing");
		// Written by the presence clock as an ATTRIBUTE — jsdom has no `inert`
		// IDL property to read instead.
		expect(closing!.hasAttribute("inert")).toBe(true);

		await waitFor(() => expect(panel()).toBeNull());
		expect(scrim()).toBeNull();
	});

	it("calls onCancel exactly once when Escape is pressed twice during the exit", async () => {
		const onCancel = vi.fn();
		const onOpenChange = vi.fn();
		render(AlertDialog, {
			props: { open: true, title: "Delete project", onCancel, onOpenChange },
		});
		await nextTick();

		pressEscape();
		await nextTick();
		expect(panel()).toBeTruthy(); // still fading

		pressEscape();
		pressEscape();
		await nextTick();

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledTimes(1);
	});

	it("closes synchronously and never animates when the user asked for reduced motion", async () => {
		stubReducedMotion(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(AlertDialog, { props: { open: true, title: "Delete project" } });
		await nextTick();
		expect(panel()).toBeTruthy();

		pressEscape();
		await nextTick();

		expect(panel()).toBeNull();
		expect(scrim()).toBeNull();
		expect(animateSpy).not.toHaveBeenCalled();
	});

	it("round-trips through v-model:open", async () => {
		let open = true;
		render(AlertDialog, {
			props: {
				title: "Delete project",
				open,
				"onUpdate:open": (value: boolean) => (open = value),
			},
		});
		await nextTick();
		expect(panel()).toBeTruthy();

		await fireEvent.click(cancelButton());
		expect(open).toBe(false);
	});

	it("merges the class prop onto the panel", async () => {
		render(AlertDialog, { props: { open: true, title: "Delete project", class: "mt-4" } });
		await nextTick();
		expect(panel()!.className).toContain("mt-4");
	});

	it("exposes the panel element as ref", async () => {
		const wrapper = mount(AlertDialog, {
			props: { open: true, title: "Delete project" },
			attachTo: document.body,
		});
		await nextTick();

		expect(wrapper.vm.ref).toBe(panel());
		wrapper.unmount();
	});

	// The source suite's `describe("sound")` cases, transposed one for one. The
	// spy sits on the CONTROLLER, not on the composable, so what is asserted is
	// the cue that actually reached the singleton; the second argument is the
	// options object the cue player forwards, which is `undefined` here.
	describe("sound", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays open exactly once when the trigger opens the prompt", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(AlertDialog, {
				props: { sound: true, title: "Delete project" },
				slots: { trigger: TRIGGER_SLOT },
			});

			await fireEvent.click(triggerNode());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open", undefined);
		});

		it("plays select exactly once on Confirm, never close for the same activation", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(AlertDialog, {
				props: { sound: true, open: true, title: "Delete project", confirmLabel: "Delete" },
			});
			await nextTick();

			await fireEvent.click(confirmButton());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("plays close exactly once on Cancel, and close exactly once on Escape", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(AlertDialog, {
				props: { sound: true, open: true, title: "Delete project" },
			});
			await nextTick();

			await fireEvent.click(cancelButton());
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);

			// The source re-opens the same instance with a `rerender`; here the
			// model has already fallen to `false` and the prop it is seeded from
			// has not changed, so re-passing `open: true` is not a change and the
			// second half needs a fresh mount. The sibling Dialog suite makes the
			// same substitution.
			await settleLegs();
			cleanup();
			play.mockClear();

			render(AlertDialog, { props: { sound: true, open: true, title: "Delete project" } });
			await nextTick();
			pressEscape();
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(AlertDialog, {
				props: { open: true, title: "Delete project", confirmLabel: "Delete" },
			});
			await nextTick();

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
			await nextTick();

			await fireEvent.click(confirmButton());

			expect(play).toHaveBeenCalledTimes(1);
		});

		it("plays close exactly once when Escape is pressed twice during the exit", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(AlertDialog, { props: { sound: true, open: true, title: "Delete project" } });
			await nextTick();

			pressEscape();
			await nextTick();
			expect(panel()).toBeTruthy(); // still fading

			pressEscape();
			pressEscape();
			await nextTick();

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});
	});
});
