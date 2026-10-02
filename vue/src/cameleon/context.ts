import { inject, provide, type InjectionKey } from "vue";
import type { Skin } from "./types.js";
import { defaultSkin } from "./skins/default.js";

const SKIN_KEY: InjectionKey<SkinContext> = Symbol("cameleon-skin");

/**
 * The context value is a GETTER object, not the skin itself. This is what makes
 * a live skin switch reactive: consumers read `ctx.skin` inside a `computed`, so
 * changing the provider's `skin` prop re-runs their recipe resolution. (A plain
 * value would be captured once and never update.)
 */
export interface SkinContext {
	readonly skin: Skin;
}

/**
 * Install a skin on the current subtree. The counterpart of the Svelte barrel's
 * `setSkinContext`, renamed to say which side of the injection it is on. Must be
 * called synchronously from `setup`, like every `provide`.
 *
 * `<FancyProvider>` is the normal entry point; reach for this only in a shell
 * that must skin a subtree without the provider's wrapper element. That element
 * is what carries the skin's tokens as scoped CSS variables, the `data-skin`
 * attribute, the optional `.dark` class and the webfont `<link>` injection, so a
 * caller taking this path supplies those itself.
 */
export function provideSkin(ctx: SkinContext): void {
	provide(SKIN_KEY, ctx);
}

const FALLBACK: SkinContext = {
	get skin() {
		return defaultSkin;
	},
};

/** Read the active skin. Falls back to the default skin with no provider. */
export function useSkin(): SkinContext {
	return inject(SKIN_KEY, undefined) ?? FALLBACK;
}
