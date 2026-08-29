// Svelte action that traps Tab/Shift+Tab focus cycling within a node.
//
// On mount it remembers the previously active element, moves focus to
// `initialFocus` (or the first focusable descendant), and keeps Tab/Shift+Tab
// cycling between the first and last focusable descendants. On destroy it
// restores focus to the previously active element when `returnFocus` is true
// (the default) — see `fallbackFocus` below for what happens when that
// element is gone by the time destroy runs.
//
// An overlay that animates its exit does not wait for destroy: `onActivate`
// hands it a function that runs the same return chain at the dismiss instant,
// and destroy then stands down. It hands over a second function that re-arms
// the trap when the surface comes back, because a reopen during the exit
// reverses the outro instead of remounting and this action is therefore never
// re-created. See `onActivate` below for why an animated close cannot use the
// destroy path, and why the eager return needs an undo.
//
// Ordering requirement for callers combining this with `portal`: put
// `use:portal` and `use:focusTrap` on the exact same element, with
// `use:portal` written first. A child node's `use:` action can run before
// its parent's, so a version that wraps the trapped node in a separate
// `<div use:portal>` and puts `use:focusTrap` on a nested child can call the
// initial `.focus()` while the whole subtree is still detached from
// `document` — `.focus()` on a detached element is a silent no-op in every
// browser (jsdom included): no error, no warning, focus simply never lands.
// Two actions on one element are guaranteed to run in declaration order
// regardless of how the framework schedules effects across a parent/child
// pair, which is what actually avoids this. `dialog/DialogSurface.svelte`
// is the reference example.

import type { Action } from "svelte/action";

export interface FocusTrapOptions {
	/** Element to focus when the trap activates. Defaults to the first focusable descendant of node. */
	initialFocus?: HTMLElement | null;
	/** Whether to restore focus to the previously active element on destroy. Defaults to true. */
	returnFocus?: boolean;
	/**
	 * Called on destroy, but only when the element that had focus before the
	 * trap activated is no longer in the document — removed by a re-render,
	 * a list row disappearing, a trigger inside a reordering `{#each}`.
	 * Should return a still-connected element to focus instead, typically
	 * the overlay's own trigger, or `null`/`undefined` to fall through to
	 * the last resort below. Never called while the original element is
	 * still connected — that element always wins first, unconditionally.
	 */
	fallbackFocus?: () => HTMLElement | null | undefined;
	/**
	 * Called once, synchronously, as the trap activates, with two functions:
	 *
	 * 1. `returnFocusNow` — runs the return chain IMMEDIATELY and disarms
	 *    `destroy()`'s own return. Idempotent: calling it twice, or letting
	 *    `destroy()` follow it, returns focus exactly once. Overlays call it
	 *    from `onoutrostart`.
	 * 2. `rearm` — undoes that latch and puts focus back inside the trap.
	 *    Overlays call it from `onintrostart`.
	 *
	 * The first exists because an animated exit delays `destroy()` by the
	 * length of the fade. Without it a keyboard user pressing Escape waits
	 * 200 ms for focus to come back — and worse, Svelte sets `inert` on the
	 * panel the instant the exit starts, which drops focus to `<body>` for
	 * that whole window. `outrostart` is the one event that fires on every
	 * close path (Escape, outside click, close button, a caller's own
	 * `bind:open` write) and fires before the node is removed.
	 *
	 * The second exists because a surface reopened DURING its exit is not a
	 * new mount. Svelte reverses the outro and resumes the same branch
	 * (`reactivity/effects.js`'s `resume_children` clears INERT and calls
	 * `transition.in()`; the action factory in `dom/elements/actions.js` runs
	 * once per mount, untracked), so this action is never re-created, the
	 * initial focus move never re-runs, and the latch below stays set. Without
	 * `rearm` the reopened panel would be `aria-modal` and interactive again
	 * with focus sitting on the trigger *behind* it — untrapped, because the
	 * Tab handler is bound to the panel — and its next dismiss would return
	 * focus nowhere at all, the handle and `destroy()` both being permanently
	 * disarmed for the life of the instance.
	 *
	 * A caller that passes both `onActivate` and `returnFocus: false` is
	 * contradicting itself, and the handle wins: asking for the handle IS
	 * asking for the return. `returnFocus: false` governs the *unmount* path
	 * only.
	 */
	onActivate?: (returnFocusNow: () => void, rearm: () => void) => void;
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

export const focusTrap: Action<HTMLElement, FocusTrapOptions | undefined> = (node, opts = {}) => {
	// Actions only run in the browser, but stay defensive for SSR contexts.
	if (typeof document === "undefined") {
		return {};
	}

	let returnFocus = opts.returnFocus ?? true;
	let fallbackFocus = opts.fallbackFocus;
	// Tracked like the other two rather than read off the original `opts`:
	// a caller that retargets the initial focus between form steps updates
	// the action, and `rearm()` below has to honour the CURRENT target, not
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

	function focusInitial(initialFocus: HTMLElement | null | undefined) {
		const target = initialFocus ?? getFocusableElements(node)[0] ?? null;
		if (target) target.focus();
		else focusContainerFallback();
	}

	// The three-step return chain, extracted so it can be run EAGERLY at the
	// dismiss instant (via `onActivate`'s handle) as well as at destroy. The
	// latch makes it run exactly once whichever path gets there first.
	let returned = false;

	function returnFocus_() {
		// The latch guards as well as records: the handle may be called more
		// than once (a reopen mid-exit, a caller being careful), and destroy()
		// may still follow it. Focus moves exactly once either way.
		if (returned) return;
		returned = true;

		// `previouslyFocused` is a raw reference, captured at mount and
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

	// The counterpart to the handle, run when the surface comes BACK — a
	// reopen mid-exit reverses the outro rather than remounting, so this
	// action, and the latch above, survive the aborted close (see
	// `onActivate`). Clearing the latch re-arms both the handle and
	// `destroy()` for the next dismiss; focus is pulled back only when it has
	// left the node, which makes the ordinary first intro a no-op (focus is
	// already where `focusInitial` just put it) and never yanks focus away
	// from a user who has moved it inside the panel themselves.
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

		const first = focusable[0];
		const last = focusable[focusable.length - 1];
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
	// Handed over AFTER the initial focus move, so a caller that calls the
	// handle synchronously inside `onActivate` still restores the element the
	// trap displaced rather than racing it.
	opts.onActivate?.(returnFocus_, rearm);
	node.addEventListener("keydown", handleKeydown);

	return {
		update(newOpts: FocusTrapOptions = {}) {
			returnFocus = newOpts.returnFocus ?? true;
			fallbackFocus = newOpts.fallbackFocus;
			initialFocus = newOpts.initialFocus;
		},
		destroy() {
			node.removeEventListener("keydown", handleKeydown);
			// `returned` disarms this path once the eager handle has already run
			// it — an animated exit calls the handle at `outrostart` and only
			// gets here when the fade finishes, and focus must move exactly once.
			if (!returnFocus || returned) return;
			returnFocus_();
		},
	};
};
