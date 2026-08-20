/**
 * Cameleon Engine — multi-skin UI primitives for fancy-ui.
 *
 * Same component API, radically different art directions ("skins"): each skin
 * carries tokens (CSS custom properties), recipes (pure functions returning
 * class strings per primitive), optional ornaments and per-skin CSS.
 *
 * Published as `fancy-ui-svelte/cameleon` (with the retro-os component kit at
 * `fancy-ui-svelte/cameleon/retro-kit`). Consumers wrap a subtree:
 *
 *   import { FancyProvider, Button, brutalSkin } from "fancy-ui-svelte/cameleon";
 *   <FancyProvider skin={brutalSkin}> ... </FancyProvider>
 */
export { default as FancyProvider, type FancyProviderProps } from "./FancyProvider.svelte";
export { useSkin, setSkinContext, type SkinContext } from "./context.js";
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
