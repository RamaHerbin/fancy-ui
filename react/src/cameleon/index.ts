"use client";

/**
 * Cameleon Engine — multi-skin UI primitives for fancy-ui.
 *
 * Same component API, radically different art directions ("skins"). Internal /
 * not published yet: this compiles into dist but is not surfaced from the
 * package root, so it stays a docs-site subsystem until deliberately promoted.
 *
 *   import { FancyProvider, Button, brutalSkin } from "./cameleon/index.js";
 *   <FancyProvider skin={brutalSkin}> ... </FancyProvider>
 */
export { FancyProvider, type FancyProviderProps } from "./FancyProvider.js";
export { useSkin, type SkinContext } from "./context.js";
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
