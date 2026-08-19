// Svelte action that traps Tab/Shift+Tab focus cycling within a node.
//
// On mount it remembers the previously active element, moves focus to
// `initialFocus` (or the first focusable descendant), and keeps Tab/Shift+Tab
// cycling between the first and last focusable descendants. On destroy it
// restores focus to the previously active element when `returnFocus` is true
// (the default) — see `fallbackFocus` below for what happens when that
// element is gone by the time destroy runs.
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
	const previouslyFocused = document.activeElement as HTMLElement | null;

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

	focusInitial(opts.initialFocus);
	node.addEventListener("keydown", handleKeydown);

	return {
		update(newOpts: FocusTrapOptions = {}) {
			returnFocus = newOpts.returnFocus ?? true;
			fallbackFocus = newOpts.fallbackFocus;
		},
		destroy() {
			node.removeEventListener("keydown", handleKeydown);
			if (!returnFocus) return;

			// `previouslyFocused` is a raw reference captured once at mount —
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
		},
	};
};
