import { render, cleanup } from "@testing-library/vue";
import { defineComponent, h, nextTick, ref, useTemplateRef, type PropType } from "vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import { __dismissableLayerCount } from "./dismissable.js";
import { useDismissable } from "./use-dismissable.js";

function pressEscape() {
	document.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
	);
}

function pointerDownOn(target: HTMLElement) {
	// This package's jsdom version does not implement PointerEvent; the core
	// only reads `event.target`, so a same-typed MouseEvent stands in.
	const PointerDownCtor = typeof PointerEvent !== "undefined" ? PointerEvent : MouseEvent;
	target.dispatchEvent(new PointerDownCtor("pointerdown", { bubbles: true, cancelable: true }));
}

function makeHarness(onDismiss: () => void, extra: Record<string, unknown> = {}) {
	return defineComponent({
		props: { active: { type: Boolean, default: true }, enabled: { type: Boolean, default: true } },
		setup(props) {
			const panel = useTemplateRef<HTMLDivElement>("panel");
			useDismissable(panel, () => ({
				onDismiss,
				active: () => props.active,
				enabled: props.enabled,
				...extra,
			}));
			return () => h("div", { ref: "panel" }, "panel");
		},
	});
}

describe("useDismissable", () => {
	afterEach(() => {
		cleanup();
	});

	it("calls onDismiss on Escape", async () => {
		const onDismiss = vi.fn();
		render(makeHarness(onDismiss));
		await nextTick(); // let the flush:'post' attach watcher run

		pressEscape();
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it("calls onDismiss on an outside pointerdown", async () => {
		const onDismiss = vi.fn();
		render(makeHarness(onDismiss));
		await nextTick();

		pointerDownOn(document.body);
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it("does not dismiss on a pointerdown inside the node", async () => {
		const onDismiss = vi.fn();
		const { container } = render(makeHarness(onDismiss));
		await nextTick();

		pointerDownOn(container.querySelector("div")!);
		expect(onDismiss).not.toHaveBeenCalled();
	});

	it("does not react while `active` reads false", async () => {
		const onDismiss = vi.fn();
		render(makeHarness(onDismiss), { props: { active: false } });
		await nextTick();

		pressEscape();
		expect(onDismiss).not.toHaveBeenCalled();
	});

	it("only the top layer reacts: a nested dismissable swallows Escape from the outer one", async () => {
		// Mirrors real usage (an ancestor overlay already open when a
		// descendant one opens inside it, e.g. a Popover inside a Dialog):
		// the inner layer is mounted in a LATER flush than the outer one, so
		// push order equals open order (dismissable.ts's own documented
		// contract — see "Known limitation" in internals-api.md §3.3: two
		// composables attaching in the very same flush push inside-out).
		const outerDismiss = vi.fn();
		const innerDismiss = vi.fn();
		const showInner = ref(false);

		const Inner = defineComponent({
			setup() {
				const inner = useTemplateRef<HTMLDivElement>("inner");
				useDismissable(inner, () => ({ onDismiss: innerDismiss }));
				return () => h("div", { ref: "inner" }, "inner");
			},
		});

		const Outer = defineComponent({
			setup() {
				const outer = useTemplateRef<HTMLDivElement>("outer");
				useDismissable(outer, () => ({ onDismiss: outerDismiss }));
				return () => h("div", { ref: "outer" }, [showInner.value ? h(Inner) : null]);
			},
		});

		render(Outer);
		await nextTick(); // outer layer attaches first, alone
		showInner.value = true;
		await nextTick(); // inner mounts and attaches in a later flush — on top

		pressEscape();

		expect(innerDismiss).toHaveBeenCalledTimes(1);
		expect(outerDismiss).not.toHaveBeenCalled();
	});

	it("does not attach when enabled is false", async () => {
		const onDismiss = vi.fn();
		render(makeHarness(onDismiss), { props: { enabled: false } });
		await nextTick();

		pressEscape();
		expect(onDismiss).not.toHaveBeenCalled();
	});

	it("detaches on unmount: a dismissed layer stops reacting", async () => {
		const onDismiss = vi.fn();
		const { unmount } = render(makeHarness(onDismiss));
		await nextTick();
		unmount();

		pressEscape();
		expect(onDismiss).not.toHaveBeenCalled();
	});

	it("respects escape: false and outsideClick: false", async () => {
		const onDismiss = vi.fn();
		render(makeHarness(onDismiss, { escape: false, outsideClick: false }));
		await nextTick();

		pressEscape();
		pointerDownOn(document.body);
		expect(onDismiss).not.toHaveBeenCalled();
	});

	// Leak suite (§9.4). Vue has no double-invoke, so the coverage React buys
	// with StrictMode is bought here with a mount / unmount / mount / unmount
	// cycle: exactly one layer while mounted, none after. The behavioural
	// half is asserted alongside the counter — a layer still on the stack at
	// rest would be the top layer and would answer.
	it("leak suite: mount / unmount / mount / unmount leaves no layer on the stack", async () => {
		const onDismiss = vi.fn();
		expect(__dismissableLayerCount()).toBe(0);

		const first = render(makeHarness(onDismiss));
		await nextTick();
		expect(__dismissableLayerCount()).toBe(1);
		pressEscape();
		expect(onDismiss).toHaveBeenCalledTimes(1);
		first.unmount();
		expect(__dismissableLayerCount()).toBe(0);

		const second = render(makeHarness(onDismiss));
		await nextTick();
		expect(__dismissableLayerCount()).toBe(1);
		pressEscape();
		expect(onDismiss).toHaveBeenCalledTimes(2);
		second.unmount();
		expect(__dismissableLayerCount()).toBe(0);

		pressEscape();
		pointerDownOn(document.body);
		expect(onDismiss).toHaveBeenCalledTimes(2);
	});

	// The composable can detach WITHOUT unmounting — `enabled` flipping false,
	// or the element ref going null — and the core's `destroy()` must run then
	// too, or the toggle leaks a layer and a document listener.
	it("leaves no layer behind when `enabled` toggles off and on mid-life", async () => {
		const onDismiss = vi.fn();
		const { rerender, unmount } = render(makeHarness(onDismiss));
		await nextTick();
		expect(__dismissableLayerCount()).toBe(1);

		await rerender({ enabled: false });
		await nextTick();
		expect(__dismissableLayerCount()).toBe(0);

		await rerender({ enabled: true });
		await nextTick();
		expect(__dismissableLayerCount()).toBe(1);

		unmount();
		expect(__dismissableLayerCount()).toBe(0);
	});
});

// The two `handle.update()` watchers are the only hand-written behavioural
// code in this module, and §3.3 names the exact three fields that must drive
// them. These exercise all three: a watcher that never fired would leave the
// core holding the options it attached with.
describe("useDismissable — the update path", () => {
	const ReactiveHarness = defineComponent({
		props: {
			onDismiss: { type: Function as PropType<() => void>, required: true },
			escape: { type: Boolean, default: true },
			outsideClick: { type: Boolean, default: true },
			exclude: { type: Function as PropType<() => (HTMLElement | null)[]>, default: undefined },
		},
		setup(props) {
			const panel = useTemplateRef<HTMLDivElement>("panel");
			useDismissable(panel, () => ({
				onDismiss: props.onDismiss,
				escape: props.escape,
				outsideClick: props.outsideClick,
				exclude: props.exclude,
			}));
			return () => h("div", { ref: "panel" }, "panel");
		},
	});

	afterEach(() => {
		cleanup();
	});

	it("re-sends a swapped onDismiss to the attached core", async () => {
		const first = vi.fn();
		const second = vi.fn();
		const { rerender } = render(ReactiveHarness, { props: { onDismiss: first } });
		await nextTick();

		pressEscape();
		expect(first).toHaveBeenCalledTimes(1);

		await rerender({ onDismiss: second });
		await nextTick();

		pressEscape();
		expect(second).toHaveBeenCalledTimes(1);
		expect(first).toHaveBeenCalledTimes(1);
	});

	it("re-sends a flipped `escape` to the attached core", async () => {
		const onDismiss = vi.fn();
		const { rerender } = render(ReactiveHarness, { props: { onDismiss } });
		await nextTick();

		pressEscape();
		expect(onDismiss).toHaveBeenCalledTimes(1);

		await rerender({ onDismiss, escape: false });
		await nextTick();

		pressEscape();
		expect(onDismiss).toHaveBeenCalledTimes(1);

		await rerender({ onDismiss, escape: true });
		await nextTick();

		pressEscape();
		expect(onDismiss).toHaveBeenCalledTimes(2);
	});

	it("re-sends a flipped `outsideClick` to the attached core", async () => {
		const onDismiss = vi.fn();
		const { rerender } = render(ReactiveHarness, { props: { onDismiss } });
		await nextTick();

		pointerDownOn(document.body);
		expect(onDismiss).toHaveBeenCalledTimes(1);

		await rerender({ onDismiss, outsideClick: false });
		await nextTick();

		pointerDownOn(document.body);
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it("carries a changed `exclude` through the same update, without re-attaching", async () => {
		const onDismiss = vi.fn();
		const trigger = document.createElement("button");
		document.body.appendChild(trigger);

		const { rerender } = render(ReactiveHarness, { props: { onDismiss } });
		await nextTick();

		pointerDownOn(trigger);
		expect(onDismiss).toHaveBeenCalledTimes(1);

		// `exclude` is a getter the core resolves at event time, so it is not
		// watched on its own (C-2 / D-V14); it rides along on the full options
		// object the `escape` change sends through `handle.update()`.
		await rerender({ onDismiss, escape: false, exclude: () => [trigger] });
		await rerender({ onDismiss, escape: true, exclude: () => [trigger] });
		await nextTick();

		pointerDownOn(trigger);
		expect(onDismiss).toHaveBeenCalledTimes(1);

		trigger.remove();
	});
});
