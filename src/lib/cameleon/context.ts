import { getContext, setContext } from "svelte";
import type { Skin } from "./types.js";
import { defaultSkin } from "./skins/default.js";

const SKIN_KEY = Symbol("cameleon-skin");

/**
 * The context value is a GETTER object, not the skin itself. This is what makes
 * a live skin switch reactive: consumers read `ctx.skin` inside a `$derived`, so
 * changing the provider's `skin` prop re-runs their recipe resolution. (Same
 * pattern as src/lib/fancy-ui/dock/Dock.svelte and card-3d — a plain value would
 * be captured once and never update.)
 */
export interface SkinContext {
	readonly skin: Skin;
}

export function setSkinContext(ctx: SkinContext): void {
	setContext(SKIN_KEY, ctx);
}

const FALLBACK: SkinContext = {
	get skin() {
		return defaultSkin;
	},
};

/** Read the active skin. Falls back to the default skin with no provider. */
export function useSkin(): SkinContext {
	return getContext<SkinContext>(SKIN_KEY) ?? FALLBACK;
}
