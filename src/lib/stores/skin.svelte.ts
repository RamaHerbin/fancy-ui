/**
 * Skin Store
 *
 * Manages the active docs skin ("standard" or "brutal"). This is separate from
 * the theme store (light/dark/named themes): the skin controls which Cameleon
 * art direction re-skins the docs chrome, while the theme controls light/dark
 * and the shadcn token set.
 */

import { browser } from "$app/environment";

// =============================================================================
// Types
// =============================================================================

export type DocsSkin = "standard" | "brutal";

// =============================================================================
// State
// =============================================================================

const STORAGE_KEY = "fancy-ui-skin";

let skin = $state<DocsSkin>("standard");

if (browser) {
	const saved = localStorage.getItem(STORAGE_KEY);
	if (saved === "brutal" || saved === "standard") {
		skin = saved;
	}
}

// =============================================================================
// Public API
// =============================================================================

/** Set the active docs skin. */
export function setSkin(next: DocsSkin) {
	skin = next;
	if (browser) localStorage.setItem(STORAGE_KEY, next);
}

/** Flip between the standard and brutal docs skins. */
export function toggleSkin() {
	setSkin(skin === "brutal" ? "standard" : "brutal");
}

// =============================================================================
// Reactive Getters (for use in components)
// =============================================================================

/**
 * Create a reactive skin-state object for use in components.
 *
 * @example
 * ```svelte
 * <script>
 *   import { createSkinState } from '$lib/stores';
 *   const skinState = createSkinState();
 * </script>
 * <p>Current skin: {skinState.skin}</p>
 * ```
 */
export function createSkinState() {
	return {
		get skin() {
			return skin;
		},
		get isBrutal() {
			return skin === "brutal";
		},
		setSkin,
		toggleSkin,
	};
}
