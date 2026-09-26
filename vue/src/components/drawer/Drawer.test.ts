import { cleanup, fireEvent, render, waitFor } from "@testing-library/vue";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref, watch } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Transposed case for case from the source component's suite. Four shapes
 * changed and nothing else did:
 *
 * - The source's snippet props are slots here, so `createRawSnippet(...)`
 *   becomes a template string in `slots`.
 * - `flushSync()` has no counterpart in this framework. It is replaced by a
 *   raw `dispatchEvent` followed by ONE `await nextTick()`, which lands inside
 *   the exit window for the same reason the source's `flushSync` did: the
 *   shared animation stub finishes each leg on a microtask queued DURING the
 *   flush, so the first leg is still in flight when the tick's continuation
 *   runs. Every helper below that has to observe the exit is spelled that way.
 * - The bindable `open` and `ref` become `v-model:open` and an exposed `ref`,
 *   so the `.test.svelte` harness becomes an inline `defineComponent` + `h()`.
 * - This package's jsdom implements no `PointerEvent`, and the whole gesture
 *   is built out of them, so one is installed locally (see below).
 *
 * The `inert` assertion reads the ATTRIBUTE rather than the IDL property, the
 * same call the internals suite and the Dialog suite make: jsdom implements no
 * `inert` property, and a prototype shim reflecting it would mean the case
 * passes against the shim rather than against what the presence clock writes.
 */

// `vi.mock` factories are hoisted above imports and may not close over
// outer-scope variables directly — `vi.hoisted` is the escape hatch that
// still lets the test body assert on the same mock instances the component
// actually calls.
const { lockScrollMock, releaseMock } = vi.hoisted(() => {
	const releaseMock = vi.fn();
	const lockScrollMock = vi.fn(() => releaseMock);
	return { lockScrollMock, releaseMock };
});

// The source mocked the action form too, because the component locked the page
// with `use:scrollLock`. Here `useScrollLock` is the only consumer and it
// imports `lockScroll` alone, so the acquire/release assertions keep meaning
// exactly what they meant with one export.
vi.mock("../../internals/scroll-lock.js", () => ({
	lockScroll: lockScrollMock,
}));

import Drawer from "./Drawer.vue";
import { sound } from "../../sound/sound.js";

/**
 * jsdom 26 ships no `PointerEvent`. Testing-library builds its events from
 * `window[EventType]`, so without this every `pointerdown`/`pointermove` would
 * fall back to a bare `Event` and silently drop `pointerId`, `clientY` and
 * `pointerType` — the three fields the gesture actually reads. Extending
 * `MouseEvent` is what keeps `clientY` and `button` real rather than stubbed.
 */
class PointerEventShim extends MouseEvent {
	readonly pointerId: number;
	readonly pointerType: string;

	constructor(type: string, init: PointerEventInit = {}) {
		super(type, init);
		this.pointerId = init.pointerId ?? 0;
		this.pointerType = init.pointerType ?? "";
	}
}

if (typeof window !== "undefined" && typeof window.PointerEvent === "undefined") {
	(window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEventShim;
}

// Mirrors Drawer.vue's own (not exported) DISMISS_THRESHOLD_PX — kept as a
// named constant here too so the boundary tests below read as "exactly at"
// and "one past" rather than a bare, unexplained 96/97.
const DISMISS_THRESHOLD_PX = 96;

function dialog(): HTMLElement | null {
	return document.body.querySelector('[role="dialog"]');
}

function scrim(): HTMLElement | null {
	return document.body.querySelector(".ft-drawer-scrim");
}

function closeButton(): HTMLButtonElement | null {
	return document.body.querySelector(".ft-drawer-close");
}

function dragSurface(): HTMLElement {
	return document.body.querySelector(".ft-drawer-drag-surface") as HTMLElement;
}

/**
 * Escape, dispatched raw. The awaited helpers this library ships drain more
 * than one turn, and those extra turns are exactly long enough for the stubbed
 * Web Animations API to settle the exit — so a case that used one could never
 * observe the window it is trying to assert on. A bare dispatch plus a single
 * `nextTick()` runs the dismissal and stops right inside that window.
 */
function dispatchEscape() {
	document.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
	);
}

async function pressEscape() {
	dispatchEscape();
	await nextTick();
}

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

function firePointer(target: HTMLElement, type: string, init: PointerEventInit) {
	target.dispatchEvent(
		new window.PointerEvent(type, { bubbles: true, cancelable: true, ...init })
	);
}

/**
 * Drives the same handle a real touch/mouse drag would: down at clientY 0,
 * one move to `deltaY`, then up — the component only reads the distance
 * between down and the latest move, so a single move step is enough to
 * exercise the threshold decision.
 *
 * Raw dispatches plus ONE tick, so a release past the threshold leaves the
 * assertions inside the exit window rather than after it. The source needed
 * two helpers for that; here the awaited and the synchronous shapes collapse
 * into one.
 */
async function drag(deltaY: number, pointerId = 1) {
	const surface = dragSurface();
	firePointer(surface, "pointerdown", { pointerId, clientY: 0, pointerType: "touch" });
	firePointer(surface, "pointermove", { pointerId, clientY: deltaY, pointerType: "touch" });
	firePointer(surface, "pointerup", { pointerId, clientY: deltaY, pointerType: "touch" });
	await nextTick();
}

/**
 * The counterpart of the source's `.test.svelte` rig, inline. A test can hand
 * `render` a plain prop but never a two-way binding, so the only way to prove
 * `open` travels back OUT to the consumer — and that a consumer's own value
 * can, in turn, open the drawer — is to own it here and echo it into the DOM.
 * The exposed panel element is read the same way, through the instance.
 */
const Harness = defineComponent({
	name: "DrawerHarness",
	props: {
		sound: { type: Boolean, default: false },
		onOpenChange: { type: Function, default: undefined },
	},
	setup(props) {
		const open = ref(false);
		const drawer = ref<{ ref: HTMLDivElement | null } | null>(null);

		watch(
			() => drawer.value?.ref ?? null,
			(el) => {
				el?.setAttribute("data-bound-ref", "yes");
			},
			{ flush: "post" }
		);

		return () => [
			h(
				"button",
				{ type: "button", "data-testid": "trigger", onClick: () => (open.value = true) },
				"Open"
			),
			// A close driven from OUTSIDE the drawer: the model-write path,
			// which never goes through the component's own `close()`.
			h(
				"button",
				{
					type: "button",
					"data-testid": "close-from-parent",
					onClick: () => (open.value = false),
				},
				"Close"
			),
			h(
				Drawer,
				{
					ref: drawer,
					open: open.value,
					"onUpdate:open": (value: boolean) => (open.value = value),
					onOpenChange: props.onOpenChange as ((open: boolean) => void) | undefined,
					sound: props.sound,
					title: "Filters",
				},
				{ default: () => "Body content" }
			),
			h("span", { "data-testid": "bound-open" }, String(open.value)),
		];
	},
});

describe("Drawer", () => {
	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
		vi.unstubAllGlobals();
		lockScrollMock.mockClear();
		releaseMock.mockClear();
	});

	it("renders nothing while closed", () => {
		render(Drawer, { props: { title: "Filters" } });
		expect(dialog()).toBeNull();
	});

	it("renders a modal dialog when open, anchored to the bottom", async () => {
		render(Drawer, { props: { open: true, title: "Filters" } });
		await nextTick();

		const el = dialog();
		expect(el).not.toBeNull();
		expect(el?.getAttribute("aria-modal")).toBe("true");
		expect(el?.className).toContain("bottom-0");
	});

	it("wires aria-labelledby to the real title id", async () => {
		render(Drawer, { props: { open: true, title: "Filters" } });
		await nextTick();

		const el = dialog()!;
		const labelledby = el.getAttribute("aria-labelledby");
		expect(labelledby).toBeTruthy();
		expect(document.getElementById(labelledby!)?.textContent?.trim()).toBe("Filters");
	});

	it("omits aria-labelledby when there is no title", async () => {
		render(Drawer, { props: { open: true } });
		await nextTick();

		expect(dialog()!.hasAttribute("aria-labelledby")).toBe(false);
	});

	it("falls back to aria-label for an accessible name when there is no title", async () => {
		render(Drawer, { props: { open: true, ariaLabel: "Filters" } });
		await nextTick();

		expect(dialog()!.getAttribute("aria-label")).toBe("Filters");
	});

	it("prefers aria-labelledby over ariaLabel when both are given", async () => {
		render(Drawer, { props: { open: true, title: "Filters", ariaLabel: "Ignored" } });
		await nextTick();

		expect(dialog()!.hasAttribute("aria-label")).toBe(false);
	});

	it("wires aria-describedby to the real description id", async () => {
		render(Drawer, {
			props: { open: true, title: "Filters", description: "Drag down to close." },
		});
		await nextTick();

		const el = dialog()!;
		const describedby = el.getAttribute("aria-describedby");
		expect(describedby).toBeTruthy();
		expect(document.getElementById(describedby!)?.textContent?.trim()).toBe("Drag down to close.");
	});

	it("omits aria-describedby when there is no description", async () => {
		render(Drawer, { props: { open: true, title: "Filters" } });
		await nextTick();

		expect(dialog()!.hasAttribute("aria-describedby")).toBe(false);
	});

	it("closes on Escape when dismissible (the default)", async () => {
		const onOpenChange = vi.fn();
		render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });
		await nextTick();

		await pressEscape();

		// `open` still flips synchronously — nothing a caller can observe
		// waits for the slide-out — but the panel stays mounted while it
		// plays, so its removal is what has to be awaited.
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("does not close on Escape when dismissible is false", async () => {
		const onOpenChange = vi.fn();
		render(Drawer, {
			props: { open: true, title: "Filters", dismissible: false, onOpenChange },
		});
		await nextTick();

		await pressEscape();

		expect(onOpenChange).not.toHaveBeenCalled();
		expect(dialog()).not.toBeNull();
	});

	it("closes when the scrim is clicked", async () => {
		const onOpenChange = vi.fn();
		render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });
		await nextTick();

		firePointer(scrim()!, "pointerdown", {});
		await nextTick();

		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("renders a close button that closes the drawer on click", async () => {
		const onOpenChange = vi.fn();
		render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });
		await nextTick();

		await fireEvent.click(closeButton()!);

		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("omits the close button when dismissible is false", async () => {
		render(Drawer, { props: { open: true, title: "Filters", dismissible: false } });
		await nextTick();

		expect(closeButton()).toBeNull();
	});

	it("moves focus into the panel on open", async () => {
		render(Drawer, { props: { open: true, title: "Filters" } });
		await nextTick();

		expect(dialog()!.contains(document.activeElement)).toBe(true);
	});

	it("returns focus to the previously focused element on close", async () => {
		const trigger = document.createElement("button");
		document.body.appendChild(trigger);
		trigger.focus();

		render(Drawer, { props: { open: true, title: "Filters" } });
		await nextTick();
		expect(document.activeElement).not.toBe(trigger);

		await pressEscape();

		// Deliberately UNWRAPPED. The return happens at the dismiss instant,
		// not when the slide-out ends: the focus trap hands the component a
		// handle it calls from the exit's start hook. Wrapping this in
		// `waitFor` would silently accept a return that only lands once the
		// panel is gone — which in a browser is 200 ms of a keyboard user
		// sitting on `<body>`, because the closing panel is made inert
		// immediately.
		expect(document.activeElement).toBe(trigger);
		trigger.remove();
	});

	it("renders body and footer slot content", async () => {
		render(Drawer, {
			props: { open: true, title: "Filters" },
			slots: { default: "<p>Body</p>", footer: '<button type="button">Apply</button>' },
		});
		await nextTick();

		expect(dialog()!.textContent).toContain("Body");
		expect(dialog()!.textContent).toContain("Apply");
	});

	it("merges a custom class onto the panel", async () => {
		render(Drawer, { props: { open: true, title: "Filters", class: "my-drawer" } });
		await nextTick();

		expect(dialog()!.className).toContain("my-drawer");
	});

	it("acquires the scroll lock on open and releases it on close", async () => {
		render(Drawer, { props: { open: true, title: "Filters" } });
		await nextTick();

		// Stays synchronous: the lock is acquired at mount, so it is in place
		// by the time the panel is on screen.
		expect(lockScrollMock).toHaveBeenCalledTimes(1);
		expect(releaseMock).not.toHaveBeenCalled();

		await pressEscape();
		// The release is deliberately NOT synchronous: it is delayed by the
		// exit, which is what keeps the page locked until the panel has
		// actually finished sliding out.
		expect(dialog()).not.toBeNull();
		expect(releaseMock).not.toHaveBeenCalled();
		await waitFor(() => expect(releaseMock).toHaveBeenCalledTimes(1));
	});

	it("ignores a second Escape during the exit — onOpenChange fires exactly once", async () => {
		const onOpenChange = vi.fn();
		render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });
		await nextTick();

		await pressEscape();
		expect(dialog()).toBeTruthy(); // still sliding out

		// The dismiss layer stops answering the moment `open` is false, so
		// neither of these reaches the drawer at all.
		dispatchEscape();
		dispatchEscape();
		await nextTick();

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("releases the scroll lock on unmount even if still open", async () => {
		const { unmount } = render(Drawer, { props: { open: true, title: "Filters" } });
		await nextTick();
		expect(lockScrollMock).toHaveBeenCalledTimes(1);

		unmount();
		expect(releaseMock).toHaveBeenCalledTimes(1);
	});

	describe("swipe to close", () => {
		it("closes when dragged past the dismiss threshold", async () => {
			const onOpenChange = vi.fn();
			render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });
			await nextTick();

			await drag(150);

			expect(onOpenChange).toHaveBeenCalledWith(false);
			await waitFor(() => expect(dialog()).toBeNull());
		});

		it("springs back at exactly the threshold — only a drag strictly past it dismisses", async () => {
			const onOpenChange = vi.fn();
			render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });
			await nextTick();

			await drag(DISMISS_THRESHOLD_PX);

			expect(onOpenChange).not.toHaveBeenCalled();
			expect(dialog()).not.toBeNull();
		});

		it("closes one pixel past the threshold", async () => {
			const onOpenChange = vi.fn();
			render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });
			await nextTick();

			await drag(DISMISS_THRESHOLD_PX + 1);

			expect(onOpenChange).toHaveBeenCalledWith(false);
			await waitFor(() => expect(dialog()).toBeNull());
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
			await nextTick();

			const surface = dragSurface();
			const setCapture = vi.fn();
			const releaseCaptureSpy = vi.fn();
			Object.assign(surface, {
				setPointerCapture: setCapture,
				releasePointerCapture: releaseCaptureSpy,
			});

			firePointer(surface, "pointerdown", { pointerId: 7, clientY: 0, pointerType: "touch" });
			await nextTick();
			expect(setCapture).toHaveBeenCalledWith(7);
			expect(releaseCaptureSpy).not.toHaveBeenCalled();

			firePointer(surface, "pointerup", { pointerId: 7, clientY: 10, pointerType: "touch" });
			await nextTick();
			expect(releaseCaptureSpy).toHaveBeenCalledWith(7);
		});

		it("springs back and leaves the drawer open when the drag falls short of the threshold", async () => {
			const onOpenChange = vi.fn();
			render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });
			await nextTick();

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
			await nextTick();

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
			await nextTick();

			await drag(150);

			expect(onOpenChange).not.toHaveBeenCalled();
			expect(dialog()).not.toBeNull();
		});

		it("is still fully usable with swipeToClose false: Escape and the scrim keep working", async () => {
			const onOpenChange = vi.fn();
			render(Drawer, {
				props: { open: true, title: "Filters", swipeToClose: false, onOpenChange },
			});
			await nextTick();

			await pressEscape();

			expect(onOpenChange).toHaveBeenCalledWith(false);
			await waitFor(() => expect(dialog()).toBeNull());
		});

		// The interaction-design half of the exit: a drag past the threshold
		// used to zero the offset and close in the same tick, which was
		// invisible only because removal was instant. With a slide-out that
		// would snap the panel back up to rest and then slide it down — two
		// gestures where the user made one.
		it("hands a past-threshold release straight to the exit, without snapping back first", async () => {
			render(Drawer, { props: { open: true, title: "Filters" } });
			await nextTick();

			await drag(150);

			const closing = dialog();
			expect(closing).toBeTruthy();
			expect(closing!.getAttribute("data-state")).toBe("closing");
			// Written by the presence clock, as an attribute, for the whole
			// exit — jsdom implements no `inert` IDL property.
			expect(closing!.hasAttribute("inert")).toBe(true);
			// The offset is still exactly where the finger left it. That is
			// the exit's start point — the transition interpolates from here
			// to a full height below the viewport rather than from rest.
			expect(closing!.style.transform).toBe("translateY(150px)");

			await waitFor(() => expect(dialog()).toBeNull());
			expect(scrim()).toBeNull();
		});

		it("removes the drawer synchronously on a past-threshold release when the user asked for reduced motion", async () => {
			stubReducedMotion(true);
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			render(Drawer, { props: { open: true, title: "Filters" } });
			await nextTick();

			await drag(150);

			expect(dialog()).toBeNull();
			expect(scrim()).toBeNull();
			expect(animateSpy).not.toHaveBeenCalled();
			animateSpy.mockRestore();
		});

		// A parent writing the bound `open` to false mid-drag bypasses the
		// component's own `close()` entirely. The exit start used to be
		// captured there and nowhere else, so it was still 0 while the panel's
		// inline transform sat at the finger's position — the drawer snapped
		// back up to rest and only then slid out.
		it("starts the exit from the live drag offset when a parent closes it mid-drag", async () => {
			const { getByTestId } = render(Harness);
			await fireEvent.click(getByTestId("trigger"));

			const surface = dragSurface();
			firePointer(surface, "pointerdown", { pointerId: 1, clientY: 0, pointerType: "touch" });
			firePointer(surface, "pointermove", { pointerId: 1, clientY: 90, pointerType: "touch" });
			await nextTick();
			expect(dialog()!.style.transform).toBe("translateY(90px)");

			// No pointerup: the drag is still live when the parent closes.
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			await fireEvent.click(getByTestId("close-from-parent"));

			const exit = animateSpy.mock.calls
				.map((call) => (call[0] as Keyframe[])?.[0]?.transform)
				.find((transform) => typeof transform === "string" && transform.includes("translateY"));

			expect(exit).toContain("90px");
			animateSpy.mockRestore();
		});

		// The drag offset is deliberately left where the finger put it. It is
		// reset on the way back IN instead, so a drawer swiped shut does not
		// reopen already pushed down by the last swipe's distance.
		it("reopens at rest after a swipe-to-close, not at the last drag offset", async () => {
			const { getByTestId } = render(Harness);

			await fireEvent.click(getByTestId("trigger"));
			await drag(150);
			await waitFor(() => expect(dialog()).toBeNull());

			await fireEvent.click(getByTestId("trigger"));
			expect(dialog()!.style.transform).toBe("translateY(0px)");
		});
	});

	it("works with a plain non-bound open plus a callback: the callback observes the close, and the panel still unmounts", async () => {
		const onOpenChange = vi.fn();
		render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });
		await nextTick();

		await fireEvent.click(closeButton()!);

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("works with the callback alone (no open prop passed at all)", async () => {
		const onOpenChange = vi.fn();
		render(Drawer, { props: { title: "Filters", onOpenChange } });
		await nextTick();

		expect(dialog()).toBeNull();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("round-trips open through v-model:open in both directions", async () => {
		const { getByTestId } = render(Harness);

		expect(dialog()).toBeNull();
		expect(getByTestId("bound-open").textContent).toBe("false");

		await fireEvent.click(getByTestId("trigger"));
		expect(dialog()).not.toBeNull();
		expect(getByTestId("bound-open").textContent).toBe("true");

		closeButton()!.click();
		await nextTick();
		// The bound value flips straight away; only the panel's removal waits
		// for the slide-out.
		expect(getByTestId("bound-open").textContent).toBe("false");
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("round-trips the panel element through the exposed ref", async () => {
		const { getByTestId } = render(Harness);
		await fireEvent.click(getByTestId("trigger"));
		expect(dialog()!.getAttribute("data-bound-ref")).toBe("yes");
	});

	// The exposed `ref` itself, read the way a consumer reads it: `ref` is a
	// reserved vnode key here, so the panel is published on the instance.
	it("exposes the panel element as ref", async () => {
		const wrapper = mount(Drawer, {
			props: { open: true, title: "Filters" },
			attachTo: document.body,
		});
		await nextTick();

		expect(wrapper.vm.ref).toBe(dialog());
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

		it("plays close exactly once when the close button dismisses", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Drawer, { props: { open: true, title: "Filters", sound: true } });
			await nextTick();

			await fireEvent.click(closeButton()!);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("plays close exactly once on a swipe committed past the threshold", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Drawer, { props: { open: true, title: "Filters", sound: true } });
			await nextTick();

			await drag(DISMISS_THRESHOLD_PX + 1);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		// The spring-back branch — a release short of the threshold — never
		// calls close() at all, so it must stay silent even with sound enabled.
		it("plays nothing when a swipe springs back short of the threshold", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Drawer, { props: { open: true, title: "Filters", sound: true } });
			await nextTick();

			await drag(40);

			expect(dialog()).not.toBeNull();
			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Drawer, { props: { open: true, title: "Filters" } });
			await nextTick();

			await fireEvent.click(closeButton()!);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when dismissible is false, even via a synthetic dispatch", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Drawer, {
				props: { open: true, title: "Filters", dismissible: false, sound: true },
			});
			await nextTick();

			dispatchEscape();
			await nextTick();

			expect(play).not.toHaveBeenCalled();
		});

		// The `if (!open) return` guard inside close() — a second Escape landing
		// during the exit must not double the cue.
		it("ignores a second Escape during the exit — close plays exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Drawer, { props: { open: true, title: "Filters", sound: true } });
			await nextTick();

			await pressEscape();
			expect(dialog()).toBeTruthy(); // still sliding out

			dispatchEscape();
			dispatchEscape();
			await nextTick();

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		// A model write closing the drawer mid-drag bypasses close() entirely
		// (see "starts the exit from the live drag offset" above) — it must
		// stay silent, exactly like a model-driven open would on Dialog.
		it("a model write that closes the drawer from outside plays nothing", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { getByTestId } = render(Harness, { props: { sound: true } });
			await fireEvent.click(getByTestId("trigger"));

			await fireEvent.click(getByTestId("close-from-parent"));

			expect(play).not.toHaveBeenCalled();
		});
	});
});
