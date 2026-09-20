/**
 * Cameleon Engine — multi-skin UI primitives for fancy-ui.
 *
 * Same component API, radically different art directions ("skins"): each skin
 * carries tokens (CSS custom properties), recipes (pure functions returning
 * class strings per primitive), optional ornaments and per-skin CSS.
 *
 * Published as `fancy-ui-vue/cameleon`. Consumers wrap a subtree:
 *
 *   import { FancyProvider, Button, brutalSkin } from "fancy-ui-vue/cameleon";
 *   <FancyProvider :skin="brutalSkin"> ... </FancyProvider>
 *
 * Two name-level differences from the Svelte barrel, both deliberate:
 *   - `setSkinContext` is `provideSkin` here, named for the side of the
 *     injection it is on. Same job: install a skin on a subtree without
 *     <FancyProvider>'s wrapper <div> (see its own doc comment for what that
 *     element carries and therefore what the caller takes on).
 *   - The retro-OS component kit, published on the Svelte side as
 *     `fancy-ui-svelte/cameleon/retro-kit`, has no Vue equivalent: this package
 *     declares the `./cameleon` subpath and nothing under it.
 */
export { default as FancyProvider, type FancyProviderProps } from "./FancyProvider.vue";
export { useSkin, provideSkin, type SkinContext } from "./context.js";
export type {
	Skin,
	SkinRecipes,
	SkinOrnaments,
	SkinFont,
	SkinMeta,
	RecipeFn,
	RecipeArgs,
	RecipeResult,
	PartState,
} from "./types.js";
export * from "./primitives/index.js";

export { defaultSkin } from "./skins/default.js";
export { auroraSkin } from "./skins/aurora/index.js";
export { brutalSkin } from "./skins/brutal/index.js";
export { glassSkin } from "./skins/glass/index.js";
export { terminalSkin } from "./skins/terminal/index.js";
export { retroOsSkin } from "./skins/retro-os/index.js";
