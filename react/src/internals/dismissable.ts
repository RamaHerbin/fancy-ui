// Calls `onDismiss` when the user presses Escape and/or clicks outside of the
// node. Both triggers are on by default and can be disabled individually.
// `exclude` lets callers ignore extra elements that live outside the node but
// should not count as "outside" (e.g. a trigger button that toggles the
// dismissable element).
//
// `attachDismissable` is the framework-free core with the action's exact
// body; `useDismissable` is the React binding on top of it. The nested-overlay
// contract — the layer stack, the downward scan past inactive layers, and the
// order of the `isActive()` guard against `stopImmediatePropagation()` — lives
// entirely in the core and must not drift.

import { useCallback, useEffect, useRef } from "react";
import type { ElementRef } from "./dom/types.js";
import { useEventCallback } from "./dom/use-event-callback.js";
import { useLiveRef } from "./dom/use-live-ref.js";

export interface DismissableCoreOptions {
	/** Called when the node should be dismissed. */
	onDismiss: () => void;
	/** Whether pressing Escape dismisses. Defaults to true. */
	escape?: boolean;
	/** Whether a pointerdown outside the node dismisses. Defaults to true. */
	outsideClick?: boolean;
	/** Elements to ignore when detecting outside clicks (e.g. a trigger button). */
	exclude?: () => (HTMLElement | null)[];
	/**
	 * Whether this layer is still the live one. A GETTER, not a boolean, and
	 * read fresh on every Escape and every outside pointerdown, so a layer
	 * that goes inactive stops answering without anything having to hand the
	 * core a new value first.
	 *
	 * Every overlay that animates its exit passes its `open`. The moment
	 * `open` flips false the layer stops answering Escape AND stops counting
	 * as the top layer, so a second Escape during the fade is a no-op and the
	 * dialog underneath gets it instead of having it swallowed by a panel that
	 * is already leaving. Defaults to always-active.
	 */
	active?: () => boolean;
	/**
	 * Whether an outside press that dismisses should keep the focus the
	 * overlay hands back. Defaults to false. Only an overlay that returns focus
	 * to a trigger on dismiss passes true (dialog, sheet, drawer, popover, menu,
	 * command menu). A panel anchored to an input that keeps focus while it is
	 * open (combobox, autocomplete) leaves it off: there the press must blur
	 * the input as usual, or the field stays focused, a focus-to-open field
	 * never reopens on the next click, and a touch keyboard stays up.
	 *
	 * With `outsideClick: false` it also keeps focus that is inside the layer
	 * through an outside press that does not dismiss, so a modal that ignores
	 * such presses does not lose focus to `<body>`. That case cancels every
	 * outside mousedown while the layer holds focus, so only a modal layer may
	 * combine the two: a non-modal one that ignores outside presses (a
	 * non-dismissible popover) leaves `keepFocus` off and the page untouched.
	 */
	keepFocus?: boolean;
}

// Stack of currently mounted dismissable layers. With nested overlays (e.g. a
// popover inside a dialog) only the top-most layer reacts to Escape or an
// outside pointerdown, so one interaction closes one layer at a time.
//
// A layer stays on this stack for as long as its node is mounted — which, for
// an overlay that animates its exit, is the whole length of the fade, because
// the surface is kept mounted through its exit leg. So "on the stack" and
// "live" are two different things, and each entry carries its own liveness
// getter to tell them apart.
interface Layer {
	node: HTMLElement;
	isActive: () => boolean;
}

const layers: Layer[] = [];

// What a mousedown can move focus to by itself. A press on anything else —
// plain text, a scrim, empty page — makes the browser blur to `<body>`.
const FOCUS_TAKING_SELECTOR =
	'a[href], area[href], button, input, select, textarea, label, summary, iframe, [tabindex], [contenteditable]:not([contenteditable="false"])';

// An outside press dismisses on `pointerdown`, and an overlay with `keepFocus`
// hands focus back (to its trigger) right then — but the press's own
// `mousedown` comes after, and on a target that cannot take focus its default
// action blurs whatever is focused to `<body>`, undoing the return a moment
// after it happened. Cancelling that ONE default keeps the returned focus. A
// press on something focusable is left alone: focus moving there is what the
// user asked for.
//
// The guard must never outlive its press. It disarms on the first of:
// - mousedown (the default it exists to cancel), click, pointercancel;
// - contextmenu (a touch long-press can open the menu with neither a click
//   nor a pointercancel);
// - a mouse pointerup, one microtask later (a mouse press dispatches its
//   mousedown before pointerup, so none is coming);
// - a timeout after a touch or pen pointerup, whose compatibility mousedown
//   arrives AFTER pointerup and so has to be waited for, but not forever.
const TOUCH_MOUSEDOWN_WINDOW_MS = 750;

function keepFocusThroughPress(target: Node) {
	const el = target instanceof Element ? target : target.parentElement;
	if (el?.closest(FOCUS_TAKING_SELECTOR)) return;

	let timer: ReturnType<typeof setTimeout> | undefined;
	let armed = true;

	function preventBlur(event: Event) {
		event.preventDefault();
		disarm();
	}
	function handlePointerup(event: Event) {
		const pointerType = (event as PointerEvent).pointerType;
		if (pointerType === "touch" || pointerType === "pen") {
			clearTimeout(timer);
			timer = setTimeout(disarm, TOUCH_MOUSEDOWN_WINDOW_MS);
		} else {
			queueMicrotask(disarm);
		}
	}
	function disarm() {
		if (!armed) return;
		armed = false;
		clearTimeout(timer);
		document.removeEventListener("mousedown", preventBlur, true);
		document.removeEventListener("click", disarm, true);
		document.removeEventListener("pointercancel", disarm, true);
		document.removeEventListener("contextmenu", disarm, true);
		document.removeEventListener("pointerup", handlePointerup, true);
	}
	document.addEventListener("mousedown", preventBlur, true);
	document.addEventListener("click", disarm, true);
	document.addEventListener("pointercancel", disarm, true);
	document.addEventListener("contextmenu", disarm, true);
	document.addEventListener("pointerup", handlePointerup, true);
}

export interface DismissableHandle {
	/** Swaps the options in place — the action's `update` under a new name. */
	update(options: DismissableCoreOptions): void;
	/** Pops this layer off the stack and detaches the document listeners. */
	destroy(): void;
}

/**
 * Registers `node` as a dismissable layer and wires the document listeners.
 *
 * SSR-safe: does nothing when `document` is unavailable.
 */
export function attachDismissable(
	node: HTMLElement,
	opts: DismissableCoreOptions
): DismissableHandle {
	if (typeof document === "undefined") {
		return { update() {}, destroy() {} };
	}

	let onDismiss = opts.onDismiss;
	let escape = opts.escape ?? true;
	let outsideClick = opts.outsideClick ?? true;
	let exclude = opts.exclude;
	let isActive = opts.active ?? (() => true);
	let keepFocus = opts.keepFocus ?? false;

	// Scans DOWN past inactive layers rather than testing only the last entry:
	// a closing panel is still ON the stack (it stays mounted for its exit),
	// it just must not be TOP of it. The first live layer found from the top
	// is the one that owns the interaction.
	function isTopLayer(): boolean {
		for (let i = layers.length - 1; i >= 0; i -= 1) {
			const candidate = layers[i]!;
			if (candidate.isActive()) return candidate.node === node;
		}
		return false;
	}

	function handleKeydown(event: KeyboardEvent) {
		// Before `stopImmediatePropagation()`, deliberately: an inactive layer
		// must not swallow the key on its way to whatever is underneath.
		if (!isActive()) return;
		if (!escape) return;
		if (event.key !== "Escape") return;
		if (!isTopLayer()) return;
		event.stopImmediatePropagation();
		onDismiss();
	}

	function handlePointerdown(event: PointerEvent) {
		if (!isActive()) return;
		if (!outsideClick && !keepFocus) return;
		if (!isTopLayer()) return;

		const target = event.target as Node | null;
		if (!target || node.contains(target)) return;

		const excluded = exclude?.() ?? [];
		if (excluded.some((el) => el?.contains(target))) return;

		if (!outsideClick) {
			// A layer that ignores outside presses (an alert dialog) still owns
			// the focus it holds: a press on its scrim or on plain page text
			// must not blur that focus out of the panel to <body>.
			if (node.contains(document.activeElement)) keepFocusThroughPress(target);
			return;
		}

		if (keepFocus) keepFocusThroughPress(target);
		onDismiss();
	}

	const layer: Layer = { node, isActive: () => isActive() };
	layers.push(layer);
	document.addEventListener("keydown", handleKeydown);
	document.addEventListener("pointerdown", handlePointerdown);

	return {
		update(newOpts: DismissableCoreOptions) {
			onDismiss = newOpts.onDismiss;
			escape = newOpts.escape ?? true;
			outsideClick = newOpts.outsideClick ?? true;
			exclude = newOpts.exclude;
			isActive = newOpts.active ?? (() => true);
			keepFocus = newOpts.keepFocus ?? false;
		},
		destroy() {
			// Spliced BY IDENTITY, so a StrictMode double cycle
			// (push → splice → push) leaves a stack of one at the same depth.
			const i = layers.indexOf(layer);
			if (i !== -1) layers.splice(i, 1);
			document.removeEventListener("keydown", handleKeydown);
			document.removeEventListener("pointerdown", handlePointerdown);
		},
	};
}

/** Test-only. Not exported from index.ts. */
export function __dismissableLayerCount(): number {
	return layers.length;
}

export interface DismissableOptions {
	/** Called when the node should be dismissed. */
	onDismiss: () => void;
	/** Escape dismisses. Default true. */
	escape?: boolean;
	/** A pointerdown outside dismisses. Default true. */
	outsideClick?: boolean;
	/**
	 * Elements that do not count as "outside" — typically the trigger. An
	 * array of nodes or refs, resolved at event time, or the getter form for
	 * a genuinely dynamic set.
	 */
	exclude?:
		| Array<ElementRef<HTMLElement> | HTMLElement | null | undefined>
		| (() => (HTMLElement | null)[]);
	/**
	 * Whether this layer is still LIVE. Pass the surface's `open`. Default true.
	 *
	 * A plain boolean where the core takes a getter: React re-renders the
	 * still-mounted exiting surface normally, so the hook can hold the current
	 * value in a live ref and hand the core a getter over it. Semantics are
	 * unchanged — a layer stays ON the stack for its whole exit and stops
	 * being TOP of it the instant `active` flips.
	 */
	active?: boolean;
	/**
	 * Keep the focus the overlay hands back through a dismissing outside press.
	 * Default false; only an overlay that returns focus to a trigger passes
	 * true. See the core option of the same name.
	 */
	keepFocus?: boolean;
	/** Whether the layer is registered at all. Default true. */
	enabled?: boolean;
}

/**
 * Dismissable behaviour for `node`.
 *
 * Returns nothing: this hook owns behaviour, not state — nothing it does is
 * rendered, so neither `useState` nor `useSyncExternalStore` has any part in
 * it.
 *
 * A passive effect, not a layout one: the layer push and the two document
 * listeners are invisible in the first painted frame, and no key can be
 * pressed before they land.
 */
export function useDismissable(node: HTMLElement | null, options: DismissableOptions): void {
	const {
		escape = true,
		outsideClick = true,
		active = true,
		keepFocus = false,
		enabled = true,
	} = options;

	const onDismiss = useEventCallback(options.onDismiss);
	const activeRef = useLiveRef(active);
	const excludeRef = useLiveRef(options.exclude);
	const escapeRef = useLiveRef(escape);
	const outsideClickRef = useLiveRef(outsideClick);
	const keepFocusRef = useLiveRef(keepFocus);

	// Getter closures over the live refs, with an identity that never changes:
	// the layer's `isActive()` and both handlers read the current render's
	// values with zero listener churn.
	const getActive = useCallback(() => activeRef.current, [activeRef]);
	const getExclude = useCallback((): (HTMLElement | null)[] => {
		const exclude = excludeRef.current;
		if (!exclude) return [];
		if (typeof exclude === "function") return exclude();
		return exclude.map((entry) => (entry && "current" in entry ? entry.current : (entry ?? null)));
	}, [excludeRef]);

	const handleRef = useRef<DismissableHandle | null>(null);

	useEffect(() => {
		if (!node || !enabled) return;

		const handle = attachDismissable(node, {
			onDismiss,
			escape: escapeRef.current,
			outsideClick: outsideClickRef.current,
			exclude: getExclude,
			active: getActive,
			keepFocus: keepFocusRef.current,
		});
		handleRef.current = handle;

		return () => {
			handleRef.current = null;
			handle.destroy();
		};
	}, [node, enabled, onDismiss, getActive, getExclude, escapeRef, outsideClickRef, keepFocusRef]);

	// `escape`, `outsideClick` and `keepFocus` are the options the core holds as
	// plain values rather than getters, so a change to any is pushed through
	// `update()` — which reassigns locals and touches no listener.
	useEffect(() => {
		handleRef.current?.update({
			onDismiss,
			escape,
			outsideClick,
			exclude: getExclude,
			active: getActive,
			keepFocus,
		});
	}, [escape, outsideClick, keepFocus, onDismiss, getActive, getExclude]);
}
