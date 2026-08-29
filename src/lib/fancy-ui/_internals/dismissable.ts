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
	/**
	 * Whether this layer is still the live one. A GETTER, not a boolean, and
	 * read fresh on every Escape and every outside pointerdown — because an
	 * action's `update()` never runs again once its owning `{#if}` branch
	 * starts closing (Svelte marks the branch INERT before it plays the outro,
	 * and the scheduler skips inert effects). A changed param would never
	 * arrive; a getter captured at creation always reads the current value.
	 *
	 * Every overlay that animates its exit passes `() => open`. The moment
	 * `open` flips false the layer stops answering Escape AND stops counting
	 * as the top layer, so a second Escape during the fade is a no-op and the
	 * dialog underneath gets it instead of having it swallowed by a panel that
	 * is already leaving. Defaults to always-active, which is exactly the
	 * behaviour every caller had before this option existed.
	 */
	active?: () => boolean;
}

// Stack of currently mounted dismissable layers. With nested overlays (e.g. a
// popover inside a dialog) only the top-most layer reacts to Escape or an
// outside pointerdown, so one interaction closes one layer at a time.
//
// A layer stays on this stack for as long as its node is mounted — which, for
// an overlay that animates its exit, is the whole length of the fade, because
// an action's `destroy()` is delayed by any outro transition in its block. So
// "on the stack" and "live" are two different things, and each entry carries
// its own liveness getter to tell them apart.
interface Layer {
	node: HTMLElement;
	isActive: () => boolean;
}

const layers: Layer[] = [];

export const dismissable: Action<HTMLElement, DismissableOptions> = (node, opts) => {
	// Actions only run in the browser, but stay defensive for SSR contexts.
	if (typeof document === "undefined") {
		return {};
	}

	let onDismiss = opts.onDismiss;
	let escape = opts.escape ?? true;
	let outsideClick = opts.outsideClick ?? true;
	let exclude = opts.exclude;
	let isActive = opts.active ?? (() => true);

	// Scans DOWN past inactive layers rather than testing only the last entry:
	// a closing panel is still ON the stack (its `destroy()` is delayed by the
	// outro), it just must not be TOP of it. The first live layer found from
	// the top is the one that owns the interaction.
	function isTopLayer(): boolean {
		for (let i = layers.length - 1; i >= 0; i -= 1) {
			if (layers[i].isActive()) return layers[i].node === node;
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
		if (!outsideClick) return;
		if (!isTopLayer()) return;

		const target = event.target as Node | null;
		if (!target || node.contains(target)) return;

		const excluded = exclude?.() ?? [];
		if (excluded.some((el) => el?.contains(target))) return;

		onDismiss();
	}

	const layer: Layer = { node, isActive: () => isActive() };
	layers.push(layer);
	document.addEventListener("keydown", handleKeydown);
	document.addEventListener("pointerdown", handlePointerdown);

	return {
		update(newOpts: DismissableOptions) {
			onDismiss = newOpts.onDismiss;
			escape = newOpts.escape ?? true;
			outsideClick = newOpts.outsideClick ?? true;
			exclude = newOpts.exclude;
			// The update path still matters for a panel whose `active` source
			// changes while it is genuinely open. It is the CLOSE that never
			// reaches here — hence the getter above, not this line.
			isActive = newOpts.active ?? (() => true);
		},
		destroy() {
			const i = layers.indexOf(layer);
			if (i !== -1) layers.splice(i, 1);
			document.removeEventListener("keydown", handleKeydown);
			document.removeEventListener("pointerdown", handlePointerdown);
		},
	};
};
