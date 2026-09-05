import { createContext, useContext } from "react";
import type { Skin } from "./types.js";
import { defaultSkin } from "./skins/default.js";

/**
 * The context value is a plain object holding the active skin, not the skin
 * itself. <FancyProvider> builds a fresh `{ skin }` object whenever its `skin`
 * prop changes, so its identity changes and every consumer re-renders — this
 * is what makes a live skin switch reactive. (Mirrors the getter-object shape
 * of the Svelte context, which relies on Svelte's own reactivity instead.)
 */
export interface SkinContext {
	readonly skin: Skin;
}

/**
 * The skin context itself, public as the React stand-in for the Svelte barrel's
 * `setSkinContext`: a shell can render `<SkinReactContext.Provider value={{ skin }}>`
 * to skin a subtree without <FancyProvider>'s wrapper <div>. That element is what
 * carries the skin's tokens as scoped CSS variables, the `data-skin` attribute, the
 * optional `.dark` class and the webfont <link> injection, so a caller taking this
 * path supplies those itself. <FancyProvider> stays the normal entry point.
 */
export const SkinReactContext = createContext<SkinContext | null>(null);

const FALLBACK: SkinContext = {
	get skin() {
		return defaultSkin;
	},
};

/** Read the active skin. Falls back to the default skin with no provider. */
export function useSkin(): SkinContext {
	return useContext(SkinReactContext) ?? FALLBACK;
}
