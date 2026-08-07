/**
 * Cameleon Engine — multi-skin UI primitives for fancy-ui.
 *
 * Same component API, radically different art directions ("skins"). Internal /
 * not published yet: this compiles to dist/cameleon but is not in package.json
 * `files`, so it stays a docs-site subsystem until deliberately promoted.
 *
 *   import { FancyProvider, Button, brutalSkin } from "$lib/cameleon";
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
export { brutalSkin } from "./skins/brutal/index.js";
export { glassSkin } from "./skins/glass/index.js";
export { terminalSkin } from "./skins/terminal/index.js";
export { retroOsSkin } from "./skins/retro-os/index.js";
