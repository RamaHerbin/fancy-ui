// Svelte action that traps Tab/Shift+Tab focus cycling within a node.
//
// On mount it remembers the previously active element, moves focus to
// `initialFocus` (or the first focusable descendant), and keeps Tab/Shift+Tab
// cycling between the first and last focusable descendants. On destroy it
// restores focus to the previously active element when `returnFocus` is true
// (the default).

import type { Action } from "svelte/action";

export interface FocusTrapOptions {
	/** Element to focus when the trap activates. Defaults to the first focusable descendant of node. */
	initialFocus?: HTMLElement | null;
	/** Whether to restore focus to the previously active element on destroy. Defaults to true. */
	returnFocus?: boolean;
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
		},
		destroy() {
			node.removeEventListener("keydown", handleKeydown);
			if (returnFocus) {
				previouslyFocused?.focus();
			}
		},
	};
};
