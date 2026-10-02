import { cleanup, fireEvent, render, waitFor } from "@testing-library/vue";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Transposed assertion-for-assertion from the source component's suite. Four
 * shapes changed and nothing else did:
 *
 * - The source's `children`/`footer` snippet props are slots here, so
 *   `createRawSnippet(...)` becomes a template string in `slots`.
 * - `tick()` becomes `nextTick()`. The source's synchronous `flushSync()` has
 *   no counterpart in this framework, so the cases that use it to land INSIDE
 *   the exit window await a tick instead — under the shared animation stub the
 *   window is still open at that point, which is what those cases need.
 * - The `.test.svelte` harness is not ported. `bind:open` becomes an inline
 *   `defineComponent` driving `v-model:open`, and `bind:ref` becomes
 *   `wrapper.vm.ref` read off a `@vue/test-utils` mount, since `ref` is a
 *   reserved vnode key here and is published on the instance instead.
 * - This package's jsdom has no `PointerEvent`, so the scrim cases dispatch a
 *   same-typed `MouseEvent` stand-in — the dismiss layer only reads
 *   `event.target`, and the internals suite makes the same substitution.
 *
 * No `inert` shim, deliberately (the sibling suites make the same call). jsdom
 * implements no `inert` IDL property, so the source's `closing.inert === true`
 * becomes `hasAttribute("inert")` — which is what the presence clock actually
 * writes, through `toggleAttribute`.
 */

// `vi.mock` factories are hoisted above imports and may not close over
// outer-scope variables directly — `vi.hoisted` is the escape hatch that still
// lets the test body assert on the same mock instances the component actually
// calls.
const { lockScrollMock, releaseMock } = vi.hoisted(() => {
	const releaseMock = vi.fn();
	const lockScrollMock = vi.fn(() => releaseMock);
	return { lockScrollMock, releaseMock };
});

vi.mock("../../internals/scroll-lock.js", () => ({
	lockScroll: lockScrollMock,
	// The action form goes through the same mock so the acquire/release
	// assertions keep meaning what they meant in the source suite.
	scrollLock: () => ({ destroy: lockScrollMock() }),
}));

import Sheet from "./Sheet.vue";
import type { SheetSide, SheetSize } from "./Sheet.vue";
import { sound } from "../../sound/sound.js";

function dialog(): HTMLElement | null {
	return document.body.querySelector('[role="dialog"]');
}

function scrim(): HTMLElement | null {
	return document.body.querySelector(".ft-sheet-scrim");
}

function closeButton(): HTMLButtonElement | null {
	return document.body.querySelector<HTMLButtonElement>(".ft-sheet-close");
}

function pressEscape() {
	document.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
	);
}

function pointerDownOn(target: HTMLElement) {
	const PointerDownCtor = typeof PointerEvent !== "undefined" ? PointerEvent : MouseEvent;
	target.dispatchEvent(new PointerDownCtor("pointerdown", { bubbles: true, cancelable: true }));
}

/**
 * Drains a leg to completion. The `animate` stub finishes each animation on a
 * microtask and the sampler chains a leading dummy into the real animation, so
 * a settled leg is two turns away; crossing a macrotask boundary drains the
 * whole chain, and the trailing `nextTick()` flushes the render the finish
 * scheduled.
 */
const settleLegs = async () => {
	await new Promise<void>((resolve) => setTimeout(resolve, 0));
	await nextTick();
};

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

/**
 * The source's `SheetHarness.test.svelte`, inline. A caller-owned `open` that
 * the trigger writes and the sheet writes back through `v-model:open`, echoed
 * into the DOM — the only way to prove `open` travels back OUT to the consumer
 * rather than merely changing what the sheet draws internally.
 */
const Harness = defineComponent({
	props: {
		sound: { type: Boolean, default: false },
		onOpenChange: { type: Function, default: undefined },
	},
	setup(props) {
		const open = ref(false);
		return () => [
			h(
				"button",
				{ type: "button", "data-testid": "trigger", onClick: () => (open.value = true) },
				"Open"
			),
			h(
				Sheet,
				{
					open: open.value,
					"onUpdate:open": (value: boolean) => (open.value = value),
					onOpenChange: props.onOpenChange as ((open: boolean) => void) | undefined,
					sound: props.sound,
					title: "Settings",
				},
				{ default: () => "Body content" }
			),
			h("span", { "data-testid": "bound-open" }, String(open.value)),
		];
	},
});

describe("Sheet", () => {
	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
		vi.unstubAllGlobals();
		lockScrollMock.mockClear();
		releaseMock.mockClear();
	});

	it("renders nothing while closed", () => {
		render(Sheet, { props: { title: "Settings" } });
		expect(dialog()).toBeNull();
	});

	it("renders a modal dialog when open", async () => {
		render(Sheet, { props: { open: true, title: "Settings" } });
		await nextTick();
		const el = dialog();
		expect(el).not.toBeNull();
		expect(el?.getAttribute("aria-modal")).toBe("true");
	});

	it("wires aria-labelledby to the real title id", async () => {
		render(Sheet, { props: { open: true, title: "Settings" } });
		await nextTick();
		const el = dialog()!;
		const labelledby = el.getAttribute("aria-labelledby");
		expect(labelledby).toBeTruthy();
		expect(document.getElementById(labelledby!)?.textContent).toBe("Settings");
	});

	it("omits aria-labelledby when there is no title", async () => {
		render(Sheet, { props: { open: true } });
		await nextTick();
		expect(dialog()!.hasAttribute("aria-labelledby")).toBe(false);
	});

	it("falls back to aria-label when there is no title", async () => {
		render(Sheet, { props: { open: true, ariaLabel: "Filters" } });
		await nextTick();
		const el = dialog()!;
		expect(el.getAttribute("aria-label")).toBe("Filters");
		expect(el.hasAttribute("aria-labelledby")).toBe(false);
	});

	it("prefers aria-labelledby over ariaLabel when both a title and ariaLabel are given", async () => {
		render(Sheet, { props: { open: true, title: "Settings", ariaLabel: "Filters" } });
		await nextTick();
		const el = dialog()!;
		expect(el.hasAttribute("aria-labelledby")).toBe(true);
		expect(el.hasAttribute("aria-label")).toBe(false);
	});

	it("wires aria-describedby to the real description id", async () => {
		render(Sheet, {
			props: { open: true, title: "Settings", description: "Update your preferences." },
		});
		await nextTick();
		const el = dialog()!;
		const describedby = el.getAttribute("aria-describedby");
		expect(describedby).toBeTruthy();
		expect(document.getElementById(describedby!)?.textContent).toBe("Update your preferences.");
	});

	it("omits aria-describedby when there is no description", async () => {
		render(Sheet, { props: { open: true, title: "Settings" } });
		await nextTick();
		expect(dialog()!.hasAttribute("aria-describedby")).toBe(false);
	});

	it("closes on Escape when dismissible (the default)", async () => {
		const onOpenChange = vi.fn();
		render(Sheet, { props: { open: true, title: "Settings", onOpenChange } });
		await nextTick();

		pressEscape();

		// `open` still flips synchronously — nothing a caller can observe
		// waits for the slide-out — but the panel stays mounted while it
		// plays, so its removal is what has to be awaited.
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("does not close on Escape when dismissible is false", async () => {
		const onOpenChange = vi.fn();
		render(Sheet, {
			props: { open: true, title: "Settings", dismissible: false, onOpenChange },
		});
		await nextTick();

		pressEscape();

		expect(onOpenChange).not.toHaveBeenCalled();
		expect(dialog()).not.toBeNull();
	});

	it("closes when the scrim is clicked", async () => {
		const onOpenChange = vi.fn();
		render(Sheet, { props: { open: true, title: "Settings", onOpenChange } });
		await nextTick();

		pointerDownOn(scrim()!);

		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("does not close on scrim click when dismissible is false", async () => {
		const onOpenChange = vi.fn();
		render(Sheet, {
			props: { open: true, title: "Settings", dismissible: false, onOpenChange },
		});
		await nextTick();

		pointerDownOn(scrim()!);

		expect(onOpenChange).not.toHaveBeenCalled();
		expect(dialog()).not.toBeNull();
	});

	it("renders a close button that closes the sheet on click", async () => {
		const onOpenChange = vi.fn();
		render(Sheet, { props: { open: true, title: "Settings", onOpenChange } });
		await nextTick();

		await fireEvent.click(closeButton()!);

		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("omits the close button when dismissible is false", async () => {
		render(Sheet, { props: { open: true, title: "Settings", dismissible: false } });
		await nextTick();
		expect(closeButton()).toBeNull();
	});

	it("moves focus into the panel on open", async () => {
		render(Sheet, { props: { open: true, title: "Settings" } });
		await nextTick();
		expect(dialog()!.contains(document.activeElement)).toBe(true);
	});

	it("returns focus to the previously focused element on close", async () => {
		const trigger = document.createElement("button");
		document.body.appendChild(trigger);
		trigger.focus();

		render(Sheet, { props: { open: true, title: "Settings" } });
		await nextTick();
		expect(document.activeElement).not.toBe(trigger);

		pressEscape();
		await nextTick();

		// Deliberately UNWRAPPED. The return happens at the dismiss instant,
		// not when the slide-out ends: the presence clock calls the trap's
		// eager return from `onExitStart`. Wrapping this in `waitFor` would
		// silently accept a return that only lands once the panel is gone —
		// which in a browser is 200 ms of a keyboard user sitting on `<body>`,
		// because the closing panel is made inert immediately.
		expect(document.activeElement).toBe(trigger);
		trigger.remove();
	});

	it.each<{ side: SheetSide; border: string; axisClass: string; otherAxisClass: string }>([
		// `axisClass`/`otherAxisClass` catch WIDTH_CLASSES/HEIGHT_CLASSES being
		// swapped in `dimensionClasses`: a horizontal side (left/right) sizes
		// with a fixed width and `h-dvh`; a vertical side (top/bottom) sizes
		// with a fixed height and `w-full`.
		{ side: "left", border: "border-r", axisClass: "h-dvh", otherAxisClass: "w-full" },
		{ side: "right", border: "border-l", axisClass: "h-dvh", otherAxisClass: "w-full" },
		{ side: "top", border: "border-b", axisClass: "w-full", otherAxisClass: "h-dvh" },
		{ side: "bottom", border: "border-t", axisClass: "w-full", otherAxisClass: "h-dvh" },
	])(
		"renders side=$side with its own data-side, border side and sizing axis",
		async ({ side, border, axisClass, otherAxisClass }) => {
			render(Sheet, { props: { open: true, title: "Settings", side } });
			await nextTick();
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

	it("defaults to side right", async () => {
		render(Sheet, { props: { open: true, title: "Settings" } });
		await nextTick();
		expect(dialog()!.getAttribute("data-side")).toBe("right");
	});

	it.each<[SheetSize, string]>([
		["sm", "w-[20rem]"],
		["md", "w-[24rem]"],
		["lg", "w-[32rem]"],
	])(
		"size=%s sets the matching width class on a horizontal side (right)",
		async (size, widthClass) => {
			render(Sheet, { props: { open: true, title: "Settings", side: "right", size } });
			await nextTick();
			expect(dialog()!.className).toContain(widthClass);
		}
	);

	it.each<[SheetSize, string]>([
		["sm", "h-[14rem]"],
		["md", "h-[18rem]"],
		["lg", "h-[24rem]"],
	])(
		"size=%s sets the matching height class on a vertical side (bottom)",
		async (size, heightClass) => {
			render(Sheet, { props: { open: true, title: "Settings", side: "bottom", size } });
			await nextTick();
			expect(dialog()!.className).toContain(heightClass);
		}
	);

	it("defaults to size md", async () => {
		render(Sheet, { props: { open: true, title: "Settings", side: "right" } });
		await nextTick();
		expect(dialog()!.className).toContain("w-[24rem]");
	});

	it("renders body and footer slot content", async () => {
		render(Sheet, {
			props: { open: true, title: "Settings" },
			slots: { default: "<p>Body</p>", footer: '<button type="button">Save</button>' },
		});
		await nextTick();
		expect(dialog()!.textContent).toContain("Body");
		expect(dialog()!.textContent).toContain("Save");
	});

	it("merges a custom class onto the panel", async () => {
		render(Sheet, { props: { open: true, title: "Settings", class: "my-sheet" } });
		await nextTick();
		expect(dialog()!.className).toContain("my-sheet");
	});

	it("acquires the scroll lock on open and releases it on close", async () => {
		const { unmount } = render(Sheet, { props: { open: true, title: "Settings" } });
		await nextTick();

		// Stays synchronous: the lock is acquired at mount, so it is in place
		// by the time the panel is on screen.
		expect(lockScrollMock).toHaveBeenCalledTimes(1);
		expect(releaseMock).not.toHaveBeenCalled();

		pressEscape();
		// The release is deliberately NOT synchronous: it is keyed on
		// `presence.mounted`, which stays true for the whole slide-out, and
		// that is what keeps the page locked until the panel has actually
		// finished leaving.
		await waitFor(() => expect(releaseMock).toHaveBeenCalledTimes(1));

		unmount();
	});

	it("releases the scroll lock on unmount even if still open", async () => {
		const { unmount } = render(Sheet, { props: { open: true, title: "Settings" } });
		await nextTick();
		expect(lockScrollMock).toHaveBeenCalledTimes(1);

		unmount();
		expect(releaseMock).toHaveBeenCalledTimes(1);
	});

	it("never acquires the scroll lock while closed", async () => {
		render(Sheet, { props: { title: "Settings" } });
		await nextTick();
		expect(lockScrollMock).not.toHaveBeenCalled();
	});

	// The exit protocol's own regression guards. Between the dismiss and the
	// unmount there is a window — 200 ms in a browser, a couple of microtasks
	// under the animation stub — and these pin what must be true inside it.
	it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
		render(Sheet, { props: { open: true, title: "Settings" } });
		await nextTick();
		expect(dialog()!.getAttribute("data-state")).toBe("open");

		pressEscape();
		await nextTick();

		const closing = dialog();
		expect(closing).toBeTruthy();
		// An ordinary binding here, unlike the source's imperative write: the
		// presence clock keeps the subtree mounted and reactive for the whole
		// exit, so there is no inert-branch scheduler to work around.
		expect(closing!.getAttribute("data-state")).toBe("closing");
		// Written by the presence clock, as an attribute, for the whole exit.
		// The assertion is here so nobody removes the transition without
		// noticing that a closing modal would go interactive again.
		expect(closing!.hasAttribute("inert")).toBe(true);
		// `data-side` survives the deletion of the keyframes it used to
		// select: it is part of the component's semantics, not decoration.
		expect(closing!.getAttribute("data-side")).toBe("right");

		await waitFor(() => expect(dialog()).toBeNull());
		expect(scrim()).toBeNull();
	});

	it("ignores a second Escape during the exit — onOpenChange fires exactly once", async () => {
		const onOpenChange = vi.fn();
		render(Sheet, { props: { open: true, title: "Settings", onOpenChange } });
		await nextTick();

		pressEscape();
		await nextTick();
		expect(dialog()).toBeTruthy(); // still sliding out

		// The dismiss layer stops answering the moment `open` is false, so
		// neither of these reaches the sheet at all.
		pressEscape();
		pressEscape();
		await nextTick();

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	// The fast path: a duration of zero makes the sampler finish synchronously
	// and never touch `element.animate()`, so a visitor who asked for less
	// motion gets exactly the synchronous close this component had before the
	// exit existed.
	it("closes synchronously and never animates when the user asked for reduced motion", async () => {
		stubReducedMotion(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(Sheet, { props: { open: true, title: "Settings" } });
		await nextTick();
		expect(dialog()).toBeTruthy();

		pressEscape();
		await nextTick();

		expect(dialog()).toBeNull();
		expect(scrim()).toBeNull();
		expect(animateSpy).not.toHaveBeenCalled();
		animateSpy.mockRestore();
	});

	it("works with a plain non-bound open plus a callback: the callback observes the close, and the panel still unmounts", async () => {
		const onOpenChange = vi.fn();
		render(Sheet, { props: { open: true, title: "Settings", onOpenChange } });
		await nextTick();

		await fireEvent.click(closeButton()!);

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("works with the callback alone (no open prop passed at all)", async () => {
		const onOpenChange = vi.fn();
		render(Sheet, { props: { title: "Settings", onOpenChange } });
		await nextTick();

		expect(dialog()).toBeNull();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("round-trips open through v-model:open in both directions", async () => {
		const { getByTestId } = render(Harness);

		expect(dialog()).toBeNull();
		expect(getByTestId("bound-open").textContent).toBe("false");

		await fireEvent.click(getByTestId("trigger"));
		await nextTick();
		expect(dialog()).not.toBeNull();
		expect(getByTestId("bound-open").textContent).toBe("true");

		await fireEvent.click(closeButton()!);
		// The bound value flips straight away; only the panel's removal waits
		// for the slide-out.
		expect(getByTestId("bound-open").textContent).toBe("false");
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("publishes the panel element as ref", async () => {
		const wrapper = mount(Sheet, {
			props: { open: true, title: "Settings" },
			attachTo: document.body,
		});
		await nextTick();

		expect(wrapper.vm.ref).toBe(dialog());
		wrapper.unmount();
	});

	describe("sound", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays close exactly once when the close button dismisses", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Sheet, { props: { open: true, title: "Settings", sound: true } });
			await nextTick();

			await fireEvent.click(closeButton()!);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("plays close exactly once on Escape, and close exactly once on a scrim click", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { unmount } = render(Sheet, {
				props: { open: true, title: "Settings", sound: true },
			});
			await nextTick();

			pressEscape();
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
			await settleLegs();
			unmount();

			play.mockClear();
			render(Sheet, { props: { open: true, title: "Settings", sound: true } });
			await nextTick();
			pointerDownOn(scrim()!);
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Sheet, { props: { open: true, title: "Settings" } });
			await nextTick();

			await fireEvent.click(closeButton()!);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when dismissible is false, even via a synthetic dispatch", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Sheet, {
				props: { open: true, title: "Settings", dismissible: false, sound: true },
			});
			await nextTick();

			pressEscape();

			expect(play).not.toHaveBeenCalled();
		});

		// The `if (!open) return` guard inside close() — a second Escape landing
		// during the exit must not double the cue.
		it("ignores a second Escape during the exit — close plays exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Sheet, { props: { open: true, title: "Settings", sound: true } });
			await nextTick();

			pressEscape();
			await nextTick();
			expect(dialog()).toBeTruthy(); // still sliding out

			pressEscape();
			pressEscape();
			await nextTick();

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		// A v-model:open write opening the sheet plays nothing (no open cue
		// exists by design); the close button on the same instance still plays
		// close.
		it("a v-model:open-driven open stays silent; the close button on that same instance still plays close", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { getByTestId } = render(Harness, { props: { sound: true } });

			await fireEvent.click(getByTestId("trigger"));
			await nextTick();
			expect(dialog()).not.toBeNull();
			expect(play).not.toHaveBeenCalled();

			await fireEvent.click(closeButton()!);
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});
	});
});
