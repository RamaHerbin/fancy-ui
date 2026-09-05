/**
 * Cameleon Engine — multi-skin UI primitives for fancy-ui.
 *
 * Same component API, radically different art directions ("skins"): each skin
 * carries tokens (CSS custom properties), recipes (pure functions returning
 * class strings per primitive), optional ornaments and per-skin CSS.
 *
 * Published as `fancy-ui-react/cameleon`. Consumers wrap a subtree:
 *
 *   import { FancyProvider, Button, brutalSkin } from "fancy-ui-react/cameleon";
 *   <FancyProvider skin={brutalSkin}> ... </FancyProvider>
 *
 * Two name-level differences from the Svelte barrel, both deliberate:
 *   - `setSkinContext` has no React counterpart — <FancyProvider> is the setter.
 *     `SkinReactContext` is exported in its place for a shell that must install
 *     a skin without the provider's wrapper <div> (see its own doc comment for
 *     what that element carries and therefore what the caller takes on).
 *   - The retro-OS component kit, published on the Svelte side as
 *     `fancy-ui-svelte/cameleon/retro-kit`, has no React equivalent: this
 *     package declares the `./cameleon` subpath and nothing under it.
 */
export { FancyProvider, type FancyProviderProps } from "./FancyProvider.js";
export { useSkin, SkinReactContext, type SkinContext } from "./context.js";
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
