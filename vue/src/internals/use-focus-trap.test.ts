import { render, cleanup } from "@testing-library/vue";
import { defineComponent, h, nextTick, ref, shallowRef, useTemplateRef, type PropType } from "vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import { useFocusTrap, type FocusTrapHandle, type FocusTrapOptions } from "./use-focus-trap.js";

function pressTab(options: { shiftKey?: boolean } = {}) {
	const event = new KeyboardEvent("keydown", {
		key: "Tab",
		shiftKey: options.shiftKey ?? false,
		bubbles: true,
		cancelable: true,
	});
	document.activeElement?.dispatchEvent(event);
	return event;
}

function makeOpener() {
	const opener = document.createElement("button");
	opener.textContent = "opener";
	document.body.appendChild(opener);
	opener.focus();
	return opener;
}

describe("useFocusTrap", () => {
	afterEach(() => {
		cleanup();
	});

	it("moves focus to the first focusable descendant on mount", async () => {
		const Harness = defineComponent({
			setup() {
				const panel = useTemplateRef<HTMLDivElement>("panel");
				useFocusTrap(panel);
				return () =>
					h("div", { ref: "panel" }, [h("button", "first"), h("button", "second")]);
			},
		});

		const { container } = render(Harness);
		await Promise.resolve();
		expect(document.activeElement).toBe(container.querySelectorAll("button")[0]);
	});

	// §9.5: "focus landing in the same flush as mount". The attach watcher is
	// `flush: 'post'`, so focus lands inside the mount's own scheduled flush —
	// one microtask, ahead of paint, with no timer and no second tick. That is
	// the whole reason the phase policy puts this on `post` and not on a
	// timer: a later landing is a visible frame with focus outside the panel.
	//
	// It is NOT synchronous with `render()`, and that is not a defect: Vue
	// assigns a template ref from a post-render effect, so the watcher on that
	// ref can only be queued once the assignment has run. Both land in the
	// mount's single flush; neither lands before it.
	it("lands focus in the mount's own flush: one microtask, no second tick", async () => {
		const Harness = defineComponent({
			setup() {
				const panel = useTemplateRef<HTMLDivElement>("panel");
				useFocusTrap(panel);
				return () => h("div", { ref: "panel" }, [h("button", "first")]);
			},
		});

		const before = document.activeElement;
		const { container } = render(Harness);
		expect(document.activeElement).toBe(before);

		await Promise.resolve();
		expect(document.activeElement).toBe(container.querySelector("button"));
	});

	it("cycles Tab from the last focusable element back to the first", async () => {
		const Harness = defineComponent({
			setup() {
				const panel = useTemplateRef<HTMLDivElement>("panel");
				useFocusTrap(panel);
				return () =>
					h("div", { ref: "panel" }, [h("button", "first"), h("button", "last")]);
			},
		});

		const { container } = render(Harness);
		await Promise.resolve();
		const [first, last] = Array.from(container.querySelectorAll("button"));
		last!.focus();

		const event = pressTab();
		expect(event.defaultPrevented).toBe(true);
		expect(document.activeElement).toBe(first);
	});

	it("returns focus to the previously focused element on unmount", async () => {
		const opener = makeOpener();

		const Harness = defineComponent({
			setup() {
				const panel = useTemplateRef<HTMLDivElement>("panel");
				useFocusTrap(panel);
				return () => h("div", { ref: "panel" }, [h("button", "inside")]);
			},
		});

		const { unmount } = render(Harness);
		await Promise.resolve();
		expect(document.activeElement).not.toBe(opener);

		unmount();
		expect(document.activeElement).toBe(opener);
		opener.remove();
	});

	it("returns a stable handle whose returnFocusNow() runs the return chain before unmount", async () => {
		const opener = makeOpener();

		let handle!: FocusTrapHandle;
		const Harness = defineComponent({
			setup() {
				const panel = useTemplateRef<HTMLDivElement>("panel");
				handle = useFocusTrap(panel);
				return () => h("div", { ref: "panel" }, [h("button", "inside")]);
			},
		});

		render(Harness);
		await Promise.resolve();
		expect(document.activeElement).not.toBe(opener);

		handle.returnFocusNow();
		expect(document.activeElement).toBe(opener);
		opener.remove();
	});

	it("the handle is a no-op before the element attaches", () => {
		let handle!: FocusTrapHandle;
		const Harness = defineComponent({
			setup() {
				handle = useFocusTrap(() => null);
				return () => h("div");
			},
		});

		render(Harness);
		expect(() => handle.returnFocusNow()).not.toThrow();
		expect(() => handle.rearm()).not.toThrow();
	});

	// §9.5: "façade identity stability across re-renders". The single property
	// the stable-façade design exists to guarantee — a caller captures this
	// object in its own `setup`, before the element exists, and must still be
	// holding the live one many renders later. Returning the core handle, or a
	// `computed`, would break exactly this.
	it("returns one façade object whose identity survives re-renders and the attach", async () => {
		const opener = makeOpener();

		const handles: FocusTrapHandle[] = [];
		let atSetup!: FocusTrapHandle;
		let returnFocusNowAtSetup!: () => void;

		const Harness = defineComponent({
			props: { label: { type: String, default: "a" } },
			setup(props) {
				const panel = useTemplateRef<HTMLDivElement>("panel");
				const handle = useFocusTrap(panel);
				atSetup = handle;
				returnFocusNowAtSetup = handle.returnFocusNow;
				return () => {
					handles.push(handle);
					return h("div", { ref: "panel" }, [h("button", props.label)]);
				};
			},
		});

		const { rerender } = render(Harness);
		await rerender({ label: "b" });
		await rerender({ label: "c" });
		await nextTick();

		expect(handles.length).toBeGreaterThan(1);
		for (const seen of handles) expect(seen).toBe(atSetup);
		// Not just the object: the methods are the same references too, so a
		// caller that destructured in `setup` is equally safe.
		expect(atSetup.returnFocusNow).toBe(returnFocusNowAtSetup);

		// And the object captured at `setup`, before the core existed, is the
		// one that drives the core now that it is attached.
		expect(document.activeElement).not.toBe(opener);
		atSetup.returnFocusNow();
		expect(document.activeElement).toBe(opener);
		opener.remove();
	});

	// Leak suite (§9.4): focus back on the trigger after each cycle, and
	// exactly one focus move per close — the `returned` latch means the eager
	// return disarms the teardown return rather than doubling it.
	it("leak suite: mount / unmount / mount / unmount returns focus exactly once per close", async () => {
		const opener = makeOpener();
		let moves = 0;
		opener.addEventListener("focus", () => {
			moves += 1;
		});

		let handle!: FocusTrapHandle;
		const Harness = defineComponent({
			setup() {
				const panel = useTemplateRef<HTMLDivElement>("panel");
				handle = useFocusTrap(panel);
				return () => h("div", { ref: "panel" }, [h("button", "inside")]);
			},
		});

		// Cycle 1 — eager return, then unmount. The latch must swallow the
		// teardown return so focus moves once, not twice.
		const first = render(Harness);
		await nextTick();
		expect(document.activeElement).not.toBe(opener);
		handle.returnFocusNow();
		first.unmount();
		expect(document.activeElement).toBe(opener);
		expect(moves).toBe(1);

		// Cycle 2 — plain unmount, no eager return. A trap left attached by
		// cycle 1 would still be holding a `keydown` listener on a detached
		// node and a stale `previouslyFocused`.
		const second = render(Harness);
		await nextTick();
		expect(document.activeElement).not.toBe(opener);
		second.unmount();
		expect(document.activeElement).toBe(opener);
		expect(moves).toBe(2);

		// At rest: nothing traps Tab any more.
		const event = pressTab();
		expect(event.defaultPrevented).toBe(false);
		expect(document.activeElement).toBe(opener);
		opener.remove();
	});
});

describe("useFocusTrap — initialFocus as a WatchSource", () => {
	afterEach(() => {
		cleanup();
	});

	it("accepts a ref that is still null during setup and resolves it at attach", async () => {
		const Harness = defineComponent({
			setup() {
				const panel = useTemplateRef<HTMLDivElement>("panel");
				const second = useTemplateRef<HTMLButtonElement>("second");
				useFocusTrap(panel, () => ({ initialFocus: second }));
				return () =>
					h("div", { ref: "panel" }, [
						h("button", "first"),
						h("button", { ref: "second" }, "second"),
					]);
			},
		});

		const { container } = render(Harness);
		await nextTick();
		expect(document.activeElement).toBe(container.querySelectorAll("button")[1]);
	});

	it("accepts a getter", async () => {
		const target = shallowRef<HTMLButtonElement | null>(null);
		const Harness = defineComponent({
			setup() {
				const panel = useTemplateRef<HTMLDivElement>("panel");
				useFocusTrap(panel, () => ({ initialFocus: () => target.value }));
				return () =>
					h("div", { ref: "panel" }, [
						h("button", "first"),
						h("button", { ref: (el) => (target.value = el as HTMLButtonElement) }, "second"),
					]);
			},
		});

		const { container } = render(Harness);
		await nextTick();
		expect(document.activeElement).toBe(container.querySelectorAll("button")[1]);
	});

	it("still accepts a bare element, exactly as the core does", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);

		const Harness = defineComponent({
			setup() {
				const panel = useTemplateRef<HTMLDivElement>("panel");
				useFocusTrap(panel, () => ({ initialFocus: outside }));
				return () => h("div", { ref: "panel" }, [h("button", "inside")]);
			},
		});

		render(Harness);
		await nextTick();
		expect(document.activeElement).toBe(outside);
		outside.remove();
	});
});

// The `handle.update()` watcher is the only hand-written behavioural code
// here, keyed on the three fields the core stores as locals and replaces:
// `initialFocus`, `returnFocus`, `fallbackFocus`. A watcher that never fired
// would leave the core holding the options it attached with.
describe("useFocusTrap — the update path", () => {
	afterEach(() => {
		cleanup();
	});

	const Harness = defineComponent({
		props: {
			options: {
				type: Function as PropType<() => FocusTrapOptions>,
				default: () => () => ({}),
			},
		},
		setup(props) {
			const panel = useTemplateRef<HTMLDivElement>("panel");
			useFocusTrap(panel, () => props.options());
			return () => h("div", { ref: "panel" }, [h("button", "inside")]);
		},
	});

	it("re-sends a changed `returnFocus`, so a later unmount stops returning focus", async () => {
		const opener = makeOpener();
		const { rerender, unmount } = render(Harness, {
			props: { options: () => ({ returnFocus: true }) },
		});
		await nextTick();
		expect(document.activeElement).not.toBe(opener);

		await rerender({ options: () => ({ returnFocus: false }) });
		await nextTick();

		unmount();
		expect(document.activeElement).not.toBe(opener);
		opener.remove();
	});

	it("re-sends a changed `fallbackFocus`, and the new one is the one consulted", async () => {
		// The opener is removed before the return chain runs, so step 1 fails
		// and step 2 — `fallbackFocus()` — decides where focus lands.
		const opener = makeOpener();
		const firstFallback = document.createElement("button");
		const secondFallback = document.createElement("button");
		document.body.append(firstFallback, secondFallback);

		const { rerender, unmount } = render(Harness, {
			props: { options: () => ({ fallbackFocus: () => firstFallback }) },
		});
		await nextTick();

		await rerender({ options: () => ({ fallbackFocus: () => secondFallback }) });
		await nextTick();

		opener.remove();
		unmount();
		expect(document.activeElement).toBe(secondFallback);

		firstFallback.remove();
		secondFallback.remove();
	});

	it("re-sends a retargeted `initialFocus`, which rearm() then honours", async () => {
		const first = document.createElement("button");
		const second = document.createElement("button");
		document.body.append(first, second);
		const target = shallowRef<HTMLElement | null>(first);

		let handle!: FocusTrapHandle;
		const Probe = defineComponent({
			setup() {
				const panel = useTemplateRef<HTMLDivElement>("panel");
				handle = useFocusTrap(panel, () => ({ initialFocus: target }));
				return () => h("div", { ref: "panel" }, [h("button", "inside")]);
			},
		});

		render(Probe);
		await nextTick();
		expect(document.activeElement).toBe(first);

		// Retarget between "form steps". `rearm()` must honour the CURRENT
		// target, which only happens if the update watcher fired.
		target.value = second;
		await nextTick();

		handle.returnFocusNow();
		handle.rearm();
		expect(document.activeElement).toBe(second);

		first.remove();
		second.remove();
	});

	it("does not re-attach on an option change: the trap is not torn down and rebuilt", async () => {
		const opener = makeOpener();
		const focusSpy = vi.fn();

		let handle!: FocusTrapHandle;
		const options = ref<FocusTrapOptions>({ returnFocus: true });
		const Probe = defineComponent({
			setup() {
				const panel = useTemplateRef<HTMLDivElement>("panel");
				handle = useFocusTrap(panel, () => options.value);
				return () =>
					h("div", { ref: "panel" }, [
						h("button", { onFocus: focusSpy, tabindex: 0 }, "inside"),
					]);
			},
		});

		render(Probe);
		await nextTick();
		expect(focusSpy).toHaveBeenCalledTimes(1);

		options.value = { returnFocus: false };
		await nextTick();

		// A re-attach would run `focusInitial` again and re-capture
		// `previouslyFocused`; neither happens.
		expect(focusSpy).toHaveBeenCalledTimes(1);
		handle.returnFocusNow();
		expect(document.activeElement).toBe(opener);
		opener.remove();
	});
});
