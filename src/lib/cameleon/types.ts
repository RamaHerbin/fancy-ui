/**
 * Cameleon Engine — the skin contract.
 *
 * A "skin" is a complete art direction, not a color theme. It changes
 * typography, borders, shadows, motion, ornaments, and structure while the
 * component API stays identical. A skin has three collaborating layers:
 *
 *   1. tokens    — CSS custom properties (the shared substrate: color, font,
 *                  radius, shadow *values*) applied scoped by <FancyProvider>.
 *   2. recipes   — pure functions returning static Tailwind class strings per
 *                  component "part" (root, label, field, panel...). This is
 *                  where structure / motion / hover formulas live.
 *   3. ornaments — Snippets the skin injects into fixed component slots for DOM
 *                  that differs per skin (Brutal's arrow, Terminal's caret).
 *
 * Plus an optional per-skin CSS file (scoped by `[data-skin="<name>"]`) for
 * pseudo-elements, textures, and keyframes a class cannot express.
 */
import type { Snippet } from "svelte";

/**
 * Component state passed to a recipe. "error"/"disabled"/"loading" are real
 * semantic states (attribute-driven). "hover"/"active"/"focus" are normally CSS
 * pseudo-states — they appear here only for the /skins state-matrix demo, where a
 * recipe FORCES that visual statically (see `demoState` on the primitives).
 */
export type PartState =
	| "default"
	| "error"
	| "disabled"
	| "loading"
	| "hover"
	| "active"
	| "focus";

/** Inputs to every recipe. Plain object → recipes are pure and unit-testable. */
export interface RecipeArgs {
	variant?: string; // "primary" | "destructive" | "secondary" | ...
	size?: string; // "sm" | "md" | "lg"
	state?: PartState;
}

/**
 * One class string per named PART.
 * IMPORTANT: values MUST be static class literals (no computed fragments like
 * `rounded-${r}`) so Tailwind v4's JIT can see them. Build them from `as const`
 * maps, mirroring src/lib/fancy-ui/book/index.ts.
 */
export type RecipeResult = Record<string, string>;

export type RecipeFn = (args: RecipeArgs) => RecipeResult;

/**
 * The recipes a skin provides — one per primitive. Every skin implements all of
 * them so components never have to handle a missing recipe. Part names per
 * recipe (the keys of the returned RecipeResult) are a fixed contract shared by
 * all skins:
 *   button   → root, label
 *   badge    → root                (args.variant: default|blue|red|yellow|green|purple|solid)
 *   input    → root
 *   textarea → root
 *   select   → root, field, chevron
 *   checkbox → root, box
 *   radio    → root, box
 *   switch   → root, thumb
 *   slider   → root                (thumb/track come from per-skin CSS via .cam-range)
 *   tooltip  → root, trigger, bubble
 */
export interface SkinRecipes {
	button: RecipeFn;
	badge: RecipeFn;
	input: RecipeFn;
	textarea: RecipeFn;
	select: RecipeFn;
	checkbox: RecipeFn;
	radio: RecipeFn;
	switch: RecipeFn;
	slider: RecipeFn;
	tooltip: RecipeFn;
}

/** Extra DOM a skin injects into a component's fixed ornament slots. */
export interface SkinOrnaments {
	/** Trailing glyph inside Button (Brutal arrow, Terminal caret marker). */
	buttonTrailing?: Snippet<[RecipeArgs]>;
	/** Eyebrow row at the top of Card (Brutal dot + mono label + / NN index). */
	cardEyebrow?: Snippet<[{ index?: number; label?: string }]>;
}

/** A webfont the skin needs. Injected once (deduped by id) by the provider. */
export interface SkinFont {
	id: string;
	href: string;
}

/**
 * Human-readable design metadata for the /skins documentation page (the
 * design-system.html reproduction). Each skin describes its own palette, type
 * scale, and specs so sections /01–/03 and /05 reflect the active skin.
 */
export interface SkinMeta {
	/** /01 Color tokens — swatches. */
	palette: { name: string; value: string; note?: string }[];
	/** /02 Typography scale — one row per specimen; `style` is inline CSS for the sample. */
	type: { sample: string; spec: string; style: string }[];
	/** /03 Grid, radius & borders. */
	specs: {
		radius: { size: string; label: string }[];
		border: string;
		shadowRest: string;
		shadowHover: string;
		spacing: string;
	};
	/** /05 Responsive variants — one card per breakpoint. */
	responsive: { label: string; note: string }[];
}

export interface Skin {
	/** Stable id — becomes the `data-skin` attribute value + font dedupe key. */
	name: string;
	label: string;
	/** Drives an optional scoped `.dark` when <FancyProvider manageColorScheme>. */
	colorScheme: "light" | "dark";
	/** CSS custom properties applied scoped to the provider's subtree. */
	tokens: Record<string, string>;
	fonts?: SkinFont[];
	recipes: SkinRecipes;
	ornaments?: SkinOrnaments;
	/** Design metadata powering the /skins documentation sections. */
	meta: SkinMeta;
}
