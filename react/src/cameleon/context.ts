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

/** Internal — <FancyProvider> is the only place that should reach for this directly. */
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
