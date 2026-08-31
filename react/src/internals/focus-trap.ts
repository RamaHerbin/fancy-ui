// Traps Tab/Shift+Tab focus cycling within a node.
//
// On activation it remembers the previously active element, moves focus to
// `initialFocus` (or the first focusable descendant), and keeps Tab/Shift+Tab
// cycling between the first and last focusable descendants. On destroy it
// restores focus to the previously active element when `returnFocus` is true
// (the default) — see `fallbackFocus` below for what happens when that
// element is gone by the time destroy runs.
//
// `attachFocusTrap` is the framework-free core: the same body the Svelte
// action has, with an `{ update, destroy }` handle. `useFocusTrap` is the
// React binding on top of it, and it mounts in a LAYOUT effect so focus lands
// before the user's first frame.
//
// An overlay that animates its exit does not wait for destroy: the handle
// carries a function that runs the same return chain at the dismiss instant,
// and destroy then stands down. It carries a second function that re-arms the
// trap when the surface comes back, because a reopen during the exit reverses
// the outro instead of remounting and the trap is therefore never re-created.
// See `FocusTrapHandle` below for why an animated close cannot use the destroy
// path, and why the eager return needs an undo.
//
// The Svelte action's ordering requirement for callers combining this with a
// portal — both actions on the same element, portal written first, so the
// initial `.focus()` never lands on a still-detached subtree — has no React
// counterpart. `Portal` renders through `createPortal`, which commits children
// into the container before any effect runs, and refs populate before layout
// effects, so the node this hook focuses is always connected. The silent-no-op
// `.focus()` hazard cannot recur here.

import { useRef } from "react";
import { useConstant, useIsomorphicLayoutEffect } from "./dom/ssr.js";
import type { ElementRef } from "./dom/types.js";
import { useEventCallback } from "./dom/use-event-callback.js";
import { useLiveRef } from "./dom/use-live-ref.js";

export interface FocusTrapOptions {
	/**
	 * Element to focus when the trap activates. Defaults to the first focusable
	 * descendant of node. A ref is resolved at every use rather than at attach
	 * time, so a target that appears later still wins.
	 */
	initialFocus?: ElementRef<HTMLElement> | HTMLElement | null;
	/**
	 * Whether to restore focus to the previously active element on destroy.
	 * Defaults to true. It does NOT govern `returnFocusNow()`: a caller that
	 * passes `returnFocus: false` and then calls the handle is contradicting
	 * itself, and the handle wins — asking for the eager return IS asking for
	 * the return. `returnFocus: false` governs the *unmount* path only.
	 */
	returnFocus?: boolean;
	/**
	 * Called on destroy, but only when the element that had focus before the
	 * trap activated is no longer in the document — removed by a re-render,
	 * a list row disappearing, a trigger inside a reordering list. Should
	 * return a still-connected element to focus instead, typically the
	 * overlay's own trigger, or `null`/`undefined` to fall through to the last
	 * resort. Never called while the original element is still connected —
	 * that element always wins first, unconditionally.
	 */
	fallbackFocus?: () => HTMLElement | null | undefined;
}

/**
 * The two functions the Svelte side hands out through `onActivate`. Here they
 * are simply RETURNED: a hook can return a value, an action cannot.
 *
 * 1. `returnFocusNow` exists because an animated exit delays the unmount by the
 *    length of the fade. Without it a keyboard user pressing Escape waits
 *    200 ms for focus to come back — and worse, the panel is marked `inert` the
 *    instant the exit starts, which drops focus to `<body>` for that whole
 *    window. It is called at the dismiss instant, from `usePresence`'s
 *    `onExitStart`, which fires on every close path (Escape, outside click,
 *    close button, a caller's own `open` write) and fires before the node goes.
 *
 * 2. `rearm` exists because a surface reopened DURING its exit is not a new
 *    mount: `usePresence` keeps it mounted through the whole exit, so the
 *    effect never re-ran, the initial focus move never re-ran, and the
 *    `returned` latch is still set. Without it the reopened `aria-modal` panel
 *    would be interactive again with focus sitting on the trigger *behind* it
 *    — untrapped, because the Tab handler is bound to the panel — and its next
 *    dismiss would return focus nowhere at all, the handle and the unmount path
 *    both being permanently disarmed for the life of the instance.
 */
export interface FocusTrapHandle {
	/**
	 * Runs the three-step return chain IMMEDIATELY and disarms the unmount
	 * return. Idempotent: calling it twice, or letting the unmount follow it,
	 * returns focus exactly once.
	 */
	returnFocusNow(): void;
	/**
	 * Undoes that latch and pulls focus back inside, recapturing the element it
	 * displaced. Called at `onEnterStart` when a surface is reopened mid-exit.
	 */
	rearm(): void;
}

export interface FocusTrapCoreHandle extends FocusTrapHandle {
	update(options?: FocusTrapOptions): void;
	destroy(): void;
}

const FOCUSABLE_SELECTOR = [
	"button:not([disabled])",
	"[href]:not([disabled])",
	"input:not([disabled])",
	"select:not([disabled])",
	"textarea:not([disabled])",
	'[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(", ");

function isVisible(el: HTMLElement): boolean {
	// offsetParent/getClientRects are unusable under jsdom, so rely on the
	// hidden attribute and computed styles, which jsdom does implement.
	if (el.hidden || el.closest("[hidden]") !== null) return false;
	const style = getComputedStyle(el);
	return style.display !== "none" && style.visibility !== "hidden";
}

function getFocusableElements(node: HTMLElement): HTMLElement[] {
	return Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
}

/**
 * Unwraps the one option this port widens. The Svelte action takes a raw
 * element because a Svelte template always has one by the time the action
 * runs; a React caller usually holds a ref, and resolving it lazily — here,
 * at every use — is what makes a target that mounts after the trap still win.
 */
function resolveElement(
	target: ElementRef<HTMLElement> | HTMLElement | null | undefined
): HTMLElement | null {
	if (!target) return null;
	return "current" in target ? target.current : target;
}

/**
 * The framework-free core. Activates the trap on `node` synchronously and
 * returns the handle plus `update`/`destroy`.
 *
 * SSR-safe: does nothing when `document` is unavailable.
 */
export function attachFocusTrap(
	node: HTMLElement,
	opts: FocusTrapOptions = {}
): FocusTrapCoreHandle {
	if (typeof document === "undefined") {
		return { returnFocusNow() {}, rearm() {}, update() {}, destroy() {} };
	}

	let returnFocus = opts.returnFocus ?? true;
	let fallbackFocus = opts.fallbackFocus;
	// Tracked like the other two rather than read off the original `opts`:
	// a caller that retargets the initial focus between form steps updates
	// the trap, and `rearm()` below has to honour the CURRENT target, not
	// the one this instance happened to mount with.
	let initialFocus = opts.initialFocus;
	// Not `const`: this is the element the trap displaced, and a surface
	// reopened mid-exit is displacing a different one. `rearm()` recaptures.
	let previouslyFocused = document.activeElement as HTMLElement | null;

	function focusContainerFallback() {
		// No focusable descendants (empty/loading dialog): contain focus on the
		// node itself so it does not leak to the page behind the trap.
		if (!node.hasAttribute("tabindex")) node.setAttribute("tabindex", "-1");
		node.focus();
	}

	function focusInitial(initialFocus: ElementRef<HTMLElement> | HTMLElement | null | undefined) {
		const target = resolveElement(initialFocus) ?? getFocusableElements(node)[0] ?? null;
		if (target) target.focus();
		else focusContainerFallback();
	}

	// The three-step return chain, extracted so it can be run EAGERLY at the
	// dismiss instant (via the handle) as well as at destroy. The latch makes
	// it run exactly once whichever path gets there first.
	let returned = false;

	function returnFocus_() {
		// The latch guards as well as records: the handle may be called more
		// than once (a reopen mid-exit, a caller being careful), and destroy()
		// may still follow it. Focus moves exactly once either way.
		if (returned) return;
		returned = true;

		// `previouslyFocused` is a raw reference, captured at activation and
		// recaptured by `rearm()` on a reopen —
		// `.focus()` on it is the same silent no-op a detached node always
		// is if whatever it pointed at has since left the document, so it
		// is checked rather than trusted. Three-step chain, each step only
		// reached if the one before it failed:
		//   1. The original element, if it is still connected — the
		//      common case, unchanged from before this fallback existed.
		//   2. `fallbackFocus()`, if the caller supplied one and it points
		//      at a still-connected element — typically the overlay's own
		//      trigger: a real, findable place for focus to land even
		//      though it is not literally "back where it was."
		//   3. `document.body` — always connected, so unlike the previous
		//      two steps this one cannot fail by being disconnected. It
		//      still needs a `tabindex` to be programmatically focusable
		//      at all (the same reason `focusContainerFallback` above
		//      gives the trap node one) — real browsers implicitly treat
		//      `<body>` as tabindex="-1" for this purpose, but that
		//      default is not universal across environments, so it is
		//      set explicitly rather than assumed. This is a last
		//      resort, not a good outcome: it clears focus rather than
		//      pretending some unrelated element is where the user was,
		//      but it is never nothing — a user's focus should not
		//      silently vanish.
		if (previouslyFocused?.isConnected) {
			previouslyFocused.focus();
			return;
		}
		const fallback = fallbackFocus?.();
		if (fallback?.isConnected) {
			fallback.focus();
			return;
		}
		if (!document.body.hasAttribute("tabindex")) {
			document.body.setAttribute("tabindex", "-1");
		}
		document.body.focus();
	}

	// The counterpart to the eager return, run when the surface comes BACK — a
	// reopen mid-exit reverses the outro rather than remounting, so this trap,
	// and the latch above, survive the aborted close. Clearing the latch
	// re-arms both the handle and `destroy()` for the next dismiss; focus is
	// pulled back only when it has left the node, which makes the ordinary
	// first enter a no-op (focus is already where `focusInitial` just put it)
	// and never yanks focus away from a user who has moved it inside the panel
	// themselves.
	function rearm() {
		returned = false;
		const active = document.activeElement as HTMLElement | null;
		if (node.contains(active)) return;

		// A reopen mid-exit is a NEW opening, and it can come from a different
		// control than the one that opened the surface the first time. Without
		// recapturing, the next dismissal would return focus to the original
		// opener — or fall through to the fallback, if that opener has since
		// been removed. `document.body` is excluded because it is exactly what
		// `activeElement` reports while the exiting panel is still `inert`:
		// adopting it would throw away a perfectly good return target in
		// favour of one that clears focus.
		if (active && active !== document.body && active.isConnected) {
			previouslyFocused = active;
		}
		focusInitial(initialFocus);
	}

	// No `active` gate on the Tab handler, deliberately. Once the exit starts
	// the panel is `inert`, `.focus()` on its descendants is a browser no-op,
	// and focus has already been returned by `returnFocusNow()` — so the trap
	// has nothing left to trap and needs no flag nobody reads.
	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== "Tab") return;

		const focusable = getFocusableElements(node);
		if (focusable.length === 0) {
			event.preventDefault();
			focusContainerFallback();
			return;
		}

		const first = focusable[0]!;
		const last = focusable[focusable.length - 1]!;
		const active = document.activeElement;

		if (event.shiftKey) {
			if (active === first || !node.contains(active)) {
				event.preventDefault();
				last.focus();
			}
		} else if (active === last || !node.contains(active)) {
			event.preventDefault();
			first.focus();
		}
	}

	focusInitial(initialFocus);
	node.addEventListener("keydown", handleKeydown);

	// Returned AFTER the initial focus move, so a caller that runs the eager
	// return synchronously on the handle still restores the element the trap
	// displaced rather than racing it.
	return {
		returnFocusNow: returnFocus_,
		rearm,
		update(newOpts: FocusTrapOptions = {}) {
			returnFocus = newOpts.returnFocus ?? true;
			fallbackFocus = newOpts.fallbackFocus;
			initialFocus = newOpts.initialFocus;
		},
		destroy() {
			node.removeEventListener("keydown", handleKeydown);
			// `returned` disarms this path once the eager handle has already run
			// it — an animated exit calls the handle at the dismiss instant and
			// only gets here when the fade finishes, and focus must move exactly
			// once.
			if (!returnFocus || returned) return;
			returnFocus_();
		},
	};
}

/**
 * React binding. Pass the node (convention C-1), get back an identity-stable
 * handle that is safe in a dependency array.
 *
 * The trap attaches in a layout effect keyed on `[node]` so focus lands before
 * paint; option changes flow through the core's `update()` instead of
 * re-attaching, so retargeting `initialFocus` between form steps never
 * re-runs the initial focus move.
 */
export function useFocusTrap(
	node: HTMLElement | null,
	options: FocusTrapOptions = {}
): FocusTrapHandle {
	const { initialFocus = null, returnFocus = true } = options;
	// Permanently identity-stable, so it can be handed to the core once and
	// still call the caller's latest closure.
	const fallbackFocus = useEventCallback(options.fallbackFocus);

	const coreRef = useRef<FocusTrapCoreHandle | null>(null);
	// Read by the attach effect, which is keyed on `[node]` alone: the options
	// in force at the moment the trap arms, without making a changed option
	// re-arm it.
	const latest = useLiveRef<FocusTrapOptions>({ initialFocus, returnFocus, fallbackFocus });

	// One object for the life of the component. `previouslyFocused` is captured
	// inside the effect and never in a render-phase ref, which is what makes the
	// StrictMode double cycle — attach (focus panel) → cleanup (return focus to
	// the trigger) → attach (recapture the trigger, focus panel) — self-healing.
	const handle = useConstant<FocusTrapHandle>(() => ({
		returnFocusNow() {
			coreRef.current?.returnFocusNow();
		},
		rearm() {
			coreRef.current?.rearm();
		},
	}));

	useIsomorphicLayoutEffect(() => {
		if (!node) return;
		const core = attachFocusTrap(node, latest.current);
		coreRef.current = core;
		return () => {
			coreRef.current = null;
			core.destroy();
		};
	}, [node, latest]);

	useIsomorphicLayoutEffect(() => {
		coreRef.current?.update({ initialFocus, returnFocus, fallbackFocus });
	}, [initialFocus, returnFocus, fallbackFocus]);

	return handle;
}
