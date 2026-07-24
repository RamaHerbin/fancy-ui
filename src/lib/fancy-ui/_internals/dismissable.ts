// Svelte action that calls `onDismiss` when the user presses Escape and/or
// clicks outside of the node. Both triggers are on by default and can be
// disabled individually. `exclude` lets callers ignore extra elements that
// live outside the node but should not count as "outside" (e.g. a trigger
// button that toggles the dismissable element).

import type { Action } from "svelte/action";

export interface DismissableOptions {
	/** Called when the node should be dismissed. */
	onDismiss: () => void;
	/** Whether pressing Escape dismisses. Defaults to true. */
	escape?: boolean;
	/** Whether a pointerdown outside the node dismisses. Defaults to true. */
	outsideClick?: boolean;
	/** Elements to ignore when detecting outside clicks (e.g. a trigger button). */
	exclude?: () => (HTMLElement | null)[];
}

// Stack of currently mounted dismissable layers. With nested overlays (e.g. a
// popover inside a dialog) only the top-most layer reacts to Escape or an
// outside pointerdown, so one interaction closes one layer at a time.
const layers: HTMLElement[] = [];

export const dismissable: Action<HTMLElement, DismissableOptions> = (node, opts) => {
	// Actions only run in the browser, but stay defensive for SSR contexts.
	if (typeof document === "undefined") {
		return {};
	}

	let onDismiss = opts.onDismiss;
	let escape = opts.escape ?? true;
	let outsideClick = opts.outsideClick ?? true;
	let exclude = opts.exclude;

	function isTopLayer(): boolean {
		return layers[layers.length - 1] === node;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!escape) return;
		if (event.key !== "Escape") return;
		if (!isTopLayer()) return;
		event.stopImmediatePropagation();
		onDismiss();
	}

	function handlePointerdown(event: PointerEvent) {
		if (!outsideClick) return;
		if (!isTopLayer()) return;

		const target = event.target as Node | null;
		if (!target || node.contains(target)) return;

		const excluded = exclude?.() ?? [];
		if (excluded.some((el) => el?.contains(target))) return;

		onDismiss();
	}

	layers.push(node);
	document.addEventListener("keydown", handleKeydown);
	document.addEventListener("pointerdown", handlePointerdown);

	return {
		update(newOpts: DismissableOptions) {
			onDismiss = newOpts.onDismiss;
			escape = newOpts.escape ?? true;
			outsideClick = newOpts.outsideClick ?? true;
			exclude = newOpts.exclude;
		},
		destroy() {
			const i = layers.indexOf(node);
			if (i !== -1) layers.splice(i, 1);
			document.removeEventListener("keydown", handleKeydown);
			document.removeEventListener("pointerdown", handlePointerdown);
		},
	};
};
