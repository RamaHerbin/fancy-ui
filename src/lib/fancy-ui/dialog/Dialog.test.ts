import { render, cleanup, fireEvent, waitFor } from "@testing-library/svelte";
import { createRawSnippet, flushSync, tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Dialog from "./Dialog.svelte";
import { dismissable } from "../_internals/dismissable.js";
import { sound } from "../sound/sound.svelte.js";

/** Replaces `window.matchMedia` wholesale — the pattern the rest of the repo
 * uses. `prefersReducedMotion()` resolves it fresh on every call, so an
 * override installed before a render is visible to the very next read. */
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
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
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
		// Stays synchronous: `use:scrollLock` acquires at mount, so the lock is
		// in place by the time the panel is on screen. Wrapping this would
		// silently delete that requirement.
		expect(document.body.style.position).toBe("fixed");

		await rerender({ open: false, title: "Invite" });
		// The release is deliberately NOT synchronous any more: the action's
		// `destroy()` is delayed by the exit transition, which is what keeps
		// the page locked until the backdrop has actually finished fading.
		await waitFor(() => expect(document.body.style.position).toBe(""));
	});

	// The close protocol's own regression guards. Between the dismiss and the
	// unmount there is now a window — 200 ms in a browser, a couple of
	// microtasks under the WAAPI stub — and these three pin what must be true
	// inside it.
	it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
		render(Dialog, { props: { open: true, title: "Invite" } });
		await tick();
		expect(panel()!.getAttribute("data-state")).toBe("open");

		pressEscape();
		await tick();

		const closing = panel();
		expect(closing).toBeTruthy();
		// Written imperatively from `onoutrostart` — a reactive `data-state`
		// would never reach the DOM, because Svelte marks the branch inert
		// before it plays the outro.
		expect(closing!.getAttribute("data-state")).toBe("closing");
		// Svelte sets this itself on any element carrying a `transition:`, for
		// the whole exit. The assertion is here so nobody removes the
		// transition without noticing that a closing modal would go
		// interactive again.
		expect(closing!.inert).toBe(true);

		await waitFor(() => expect(panel()).toBeNull());
		expect(scrim()).toBeNull();
	});

	it("swallows a second Escape during the exit — onOpenChange fires exactly once", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, { props: { open: true, title: "Invite", onOpenChange } });
		await tick();

		pressEscape();
		await tick();
		expect(panel()).toBeTruthy(); // still fading

		pressEscape();
		pressEscape();
		await tick();

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	// A reopen inside the exit window reverses the outro instead of
	// remounting, so `use:focusTrap` is never re-created: its initial focus
	// move does not re-run and its "focus already returned" latch is still
	// set. Left alone that leaves an `aria-modal` panel open with focus on
	// the trigger BEHIND it — untrapped, since the Tab handler is bound to
	// the panel — and permanently spends the eager return, so no later close
	// of this instance returns focus at all. `focusTrap`'s re-arm handle,
	// called from `onintrostart`, is what undoes both.
	it("re-arms the focus trap when the dialog is reopened during its exit", async () => {
		render(Dialog, {
			props: {
				open: false,
				title: "Invite",
				trigger: snippet('<button type="button" data-testid="open-trigger">Invite</button>'),
			},
		});

		const trigger = document.body.querySelector<HTMLButtonElement>('[data-testid="open-trigger"]')!;
		trigger.focus();
		await fireEvent.click(trigger);
		await tick();
		expect(panel()).toBeTruthy();

		// Dismiss: focus comes back to the trigger immediately, while the
		// panel is still on screen fading.
		pressEscape();
		await tick();
		expect(panel()).toBeTruthy();
		expect(document.activeElement).toBe(trigger);

		// Reopen mid-fade — reachable precisely BECAUSE the eager return just
		// put focus on the trigger: Enter or Space on it, which the scrim does
		// not block the way it blocks a pointer.
		//
		// Dispatched and flushed SYNCHRONOUSLY on purpose. In a browser the
		// exit window is 200 ms; under the WAAPI stub it is two microtasks,
		// and any awaited helper (`fireEvent`, `tick`) drains them — the
		// branch is then destroyed and re-created, which mounts a brand-new
		// `focusTrap` and quietly tests nothing. `flushSync` resumes the same
		// branch instead, which is the reversal this pins.
		trigger.click();
		flushSync();

		const reopened = panel();
		expect(reopened).toBeTruthy();
		expect(reopened!.getAttribute("data-state")).toBe("open");
		expect(reopened!.contains(document.activeElement)).toBe(true);

		// And the next genuine dismiss still returns focus, rather than
		// stranding it on a node about to be removed.
		pressEscape();
		await tick();
		expect(document.activeElement).toBe(trigger);
	});

	// A layer that is on its way out must not swallow the key: the dismiss
	// stack scans past it and hands Escape to whatever is underneath.
	it("lets an Escape during the exit reach the layer underneath instead of swallowing it", async () => {
		// Registered BEFORE the dialog, so the dialog sits above it on the
		// shared layer stack — the shape of a dialog opened from inside
		// another dismissable surface.
		const beneath = document.createElement("div");
		document.body.appendChild(beneath);
		const onBeneath = vi.fn();
		const beneathAction = dismissable(beneath, { onDismiss: onBeneath });

		const onOpenChange = vi.fn();
		render(Dialog, { props: { open: true, title: "Invite", onOpenChange } });
		await tick();

		pressEscape(); // the dialog is the top LIVE layer and takes this one
		await tick();
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onBeneath).not.toHaveBeenCalled();
		expect(panel()).toBeTruthy();

		pressEscape(); // the dialog is inactive now, so this falls through
		expect(onBeneath).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledTimes(1);

		beneathAction?.destroy?.();
	});

	// The §1.2 fast path: `duration: 0` makes Svelte call `on_finish()`
	// synchronously and never touch `element.animate()`, so a visitor who
	// asked for less motion gets exactly the synchronous close this component
	// had before the exit existed.
	it("closes synchronously and never animates when the user asked for reduced motion", async () => {
		stubReducedMotion(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(Dialog, { props: { open: true, title: "Invite" } });
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

	describe("sound", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays open exactly once when the trigger opens the dialog", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Dialog, {
				props: {
					sound: true,
					title: "Invite",
					trigger: snippet('<button type="button" data-testid="open-trigger">Invite</button>'),
				},
			});

			const trigger = document.body.querySelector<HTMLButtonElement>(
				'[data-testid="open-trigger"]'
			)!;
			await fireEvent.click(trigger);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open");
		});

		it("plays close exactly once when the close button dismisses", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Dialog, { props: { sound: true, open: true, title: "Invite" } });
			await tick();

			await fireEvent.click(closeButton()!);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		it("plays close exactly once on Escape and close exactly once on an outside click", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { rerender } = render(Dialog, { props: { sound: true, open: true, title: "Invite" } });
			await tick();

			pressEscape();
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");

			play.mockClear();
			await rerender({ sound: true, open: true, title: "Invite" });
			await tick();
			pointerDownOn(scrim()!);
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Dialog, { props: { open: true, title: "Invite" } });
			await tick();

			await fireEvent.click(closeButton()!);
			pressEscape();

			expect(play).not.toHaveBeenCalled();
		});

		it("swallows a second Escape during the exit — close plays exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Dialog, { props: { sound: true, open: true, title: "Invite" } });
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

		it("a dialog driven purely by bind:open opens silently — no trigger and no gesture ever reaches setOpen's open branch", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			let open = false;
			const { rerender } = render(Dialog, {
				props: {
					sound: true,
					title: "Invite",
					get open() {
						return open;
					},
					set open(value: boolean) {
						open = value;
					},
				},
			});

			open = true;
			await rerender({ sound: true, open: true, title: "Invite" });
			await tick();
			expect(panel()).toBeTruthy();

			expect(play).not.toHaveBeenCalled();
		});
	});
});
