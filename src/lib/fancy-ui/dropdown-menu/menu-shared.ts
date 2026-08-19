// Behaviour shared by DropdownMenuContent and ContextMenuContent (and by
// every DropdownMenuSubContent nested inside either), so it exists once
// instead of twice. Lives here rather than in `_internals/` — which is
// frozen for this wave — because it is specific to these two component
// families, not a general-purpose primitive every floating surface needs.
// See dropdown-menu/README.md and context-menu/README.md, "Shared
// implementation".

import type { MenuContext } from "./types.js";

export interface MenuContentKeydownOptions {
	/** Called on Tab. Never calls `preventDefault` itself — the browser's own Tab traversal continues from whatever the menu core left focused. */
	onTab?: () => void;
}

/**
 * Wires ArrowUp/Down, Home/End and single-character typeahead to a level's
 * `MenuFocus` core, and Tab to `options.onTab`. Identical semantics whether
 * the panel is a `DropdownMenuContent`, a `ContextMenuContent`, or either
 * one's nested `*SubContent` — the keys navigate whatever level currently
 * holds real DOM focus, regardless of how that level's panel was opened or
 * positioned.
 *
 * ArrowRight/ArrowLeft are deliberately not handled here: their key strings
 * are more than one character, so the typeahead fallback below already
 * ignores them, and `*SubTrigger`/`*SubContent` each own their half of that
 * pair directly on the element the key is actually about.
 */
export function handleMenuContentKeydown(
	event: KeyboardEvent,
	ctx: MenuContext,
	options: MenuContentKeydownOptions = {}
): void {
	switch (event.key) {
		case "ArrowDown":
			event.preventDefault();
			ctx.focus.move(1);
			return;
		case "ArrowUp":
			event.preventDefault();
			ctx.focus.move(-1);
			return;
		case "Home":
			event.preventDefault();
			ctx.focus.moveToEdge("first");
			return;
		case "End":
			event.preventDefault();
			ctx.focus.moveToEdge("last");
			return;
		case "Tab":
			options.onTab?.();
			return;
		default:
			if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
				ctx.focus.typeahead(event.key);
			}
	}
}

/**
 * One level's registry of currently-open submenus, keyed by each submenu's
 * own trigger element. A `*Sub` calls `closeSiblingSubs` right before
 * opening itself, so only one submenu is ever open per level — the same
 * exclusivity a native menu bar gives you for free. Each `*Content`/
 * `*SubContent` owns one of these for its own direct children; it is never
 * shared across levels, which is what keeps a deeply nested submenu from
 * closing an unrelated one two levels up.
 */
export function createOpenSubRegistry(): {
	registerOpenSub(triggerEl: HTMLElement, close: () => void): () => void;
	closeSiblingSubs(exceptTriggerEl: HTMLElement): void;
} {
	const openSubs = new Map<HTMLElement, () => void>();

	return {
		registerOpenSub(triggerEl, close) {
			openSubs.set(triggerEl, close);
			return () => {
				if (openSubs.get(triggerEl) === close) openSubs.delete(triggerEl);
			};
		},
		closeSiblingSubs(exceptTriggerEl) {
			for (const [triggerEl, close] of openSubs) {
				if (triggerEl !== exceptTriggerEl) close();
			}
		},
	};
}
