/**
 * Inspiration — the content model behind /inspiration: a curated catalog of
 * UI references worth studying. Two origins share one card and one detail
 * page: a *fancyui* reference runs a real library component (optionally
 * retunable through knobs) and links to its docs in every framework; an
 * *external* reference points at an interaction somewhere else on the web
 * and carries its own, licensed media.
 *
 * One file per entry lives in `./entries/<slug>.ts`; `catalog.ts` collects
 * them. Entry files may only `import type` — node-side scripts (media
 * capture) load them without the app's module graph.
 *
 * App-side only: nothing under `src/lib/inspiration/` is published to npm
 * (`files` in package.json whitelists `dist/fancy-ui` and friends).
 */

import type { ControlDef, PlaygroundValues } from "$lib/components/PropsPlayground.svelte";

// ─── Vocabularies ──────────────────────────────────────────────────────────
// Every filterable axis is a closed list: the gallery only shows the values
// that have at least one published entry, and unknown URL values are dropped.

export const ORIGINS = ["fancyui", "external"] as const;
export type Origin = (typeof ORIGINS)[number];

/** What the reference is. Full flows can wait; `website` is a whole site. */
export const KINDS = ["interaction", "section", "screen", "website"] as const;
export type Kind = (typeof KINDS)[number];

export const KIND_LABELS: Record<Kind, string> = {
	interaction: "Interaction",
	section: "Section",
	screen: "Screen",
	website: "Website",
};

/**
 * What the visitor does to see the interaction. `ambient` means nothing —
 * the reference moves on its own.
 */
export const INTERACTIONS = [
	"hover",
	"press",
	"drag",
	"type",
	"select",
	"scroll",
	"ambient",
] as const;
export type Interaction = (typeof INTERACTIONS)[number];

export const INTERACTION_LABELS: Record<Interaction, string> = {
	hover: "Hover",
	press: "Press",
	drag: "Drag",
	type: "Type",
	select: "Select",
	scroll: "Scroll",
	ambient: "Ambient",
};

/** The visual family. Short, editorial, meant to be browsed as chips. */
export const STYLES = [
	"glow",
	"glass",
	"iridescent",
	"minimal",
	"playful",
	"editorial",
	"physical",
	"retro",
	"brutal",
] as const;
export type Style = (typeof STYLES)[number];

export const STYLE_LABELS: Record<Style, string> = {
	glow: "Glow",
	glass: "Glass",
	iridescent: "Iridescent",
	minimal: "Minimal",
	playful: "Playful",
	editorial: "Editorial",
	physical: "Physical",
	retro: "Retro",
	brutal: "Brutal",
};

/** Where the pattern is useful. Free to grow; keep each one broad. */
export const USE_CASES = [
	"navigation",
	"forms",
	"feedback",
	"marketing",
	"ai",
	"data",
	"media",
	"onboarding",
	"commerce",
] as const;
export type UseCase = (typeof USE_CASES)[number];

export const USE_CASE_LABELS: Record<UseCase, string> = {
	navigation: "Navigation",
	forms: "Forms",
	feedback: "Feedback",
	marketing: "Marketing",
	ai: "AI interfaces",
	data: "Data",
	media: "Media",
	onboarding: "Onboarding",
	commerce: "Commerce",
};

export const FRAMEWORKS = ["svelte", "react", "vue"] as const;
export type Framework = (typeof FRAMEWORKS)[number];

export const FRAMEWORK_LABELS: Record<Framework, string> = {
	svelte: "Svelte",
	react: "React",
	vue: "Vue",
};

/**
 * Whether a visitor can get the code of the *reference itself*. Free and open
 * source are different things; `unknown` is honest when nobody checked.
 */
export const CODE_AVAILABILITY = ["open-source", "free", "paid", "none", "unknown"] as const;
export type CodeAvailability = (typeof CODE_AVAILABILITY)[number];

export const CODE_AVAILABILITY_LABELS: Record<CodeAvailability, string> = {
	"open-source": "Open source",
	free: "Free",
	paid: "Paid",
	none: "No code",
	unknown: "Unknown",
};

export const STATUSES = ["draft", "published", "archived"] as const;
export type Status = (typeof STATUSES)[number];

export const SORTS = ["curated", "latest"] as const;
export type Sort = (typeof SORTS)[number];

/** Editorial collections surfaced on the homepage; membership is per entry. */
export const COLLECTIONS = ["micro-interactions", "glass-and-glow", "ai-interfaces"] as const;
export type Collection = (typeof COLLECTIONS)[number];

export const COLLECTION_META: Record<Collection, { title: string; blurb: string }> = {
	"micro-interactions": {
		title: "Micro-interactions",
		blurb: "Small moves that make a control feel held: pull, roll, settle.",
	},
	"glass-and-glow": {
		title: "Glass & glow",
		blurb: "Surfaces that catch light: edges, halos, refraction.",
	},
	"ai-interfaces": {
		title: "AI interfaces",
		blurb: "Streaming, reasoning, tools: surfaces for a model that thinks.",
	},
};

// ─── Media ─────────────────────────────────────────────────────────────────

export interface MediaProvenance {
	/** Licence the media is used under, e.g. "MIT", "Apache-2.0", "Own capture of own component". */
	license: string;
	/** Where the licence can be checked (repo LICENSE file, project page…). */
	licenseUrl?: string;
	/** Who produced the media file itself. */
	capturedBy: "fancyui" | "provided";
	/** ISO date the media was captured or received. */
	capturedAt: string;
}

export interface Media {
	type: "image" | "video";
	/** Served from `static/inspiration/`; always starts with `/inspiration/`. */
	src: string;
	/** Video only: still shown before playback and under reduced motion. */
	poster?: string;
	width: number;
	height: number;
	alt: string;
	/** Credit line shown next to the media, e.g. "Captured from the project's demo". */
	credit: string;
	provenance: MediaProvenance;
}

// ─── Live demo (FancyUI references) ────────────────────────────────────────

export interface LiveDemo {
	/** Module id → `src/lib/inspiration/demos/<module>.svelte`. */
	module: string;
	/** Tune panel controls; omitted = no tune button. */
	knobs?: ControlDef[];
	/** Values the demo starts with (every knob key must be present). */
	defaults?: PlaygroundValues;
	/**
	 * `near` (default): may mount as soon as the stage is claimed near the
	 * viewport. `intent`: only after an explicit Play — for WebGL/canvas
	 * demos, so a grid never opens a GPU context on a hover sweep.
	 */
	mount?: "near" | "intent";
}

/** Hints for `scripts/build-inspiration-media.mjs` when capturing the poster. */
export interface CaptureHints {
	/** Milliseconds to wait after mount before the shot (lets an entrance settle). */
	delay?: number;
	/** Pointer position inside the stage, as [x, y] fractions of its size. */
	hover?: [number, number];
	/** Sweep the pointer across the stage before the shot (for trails). */
	sweep?: boolean;
	/** Never capture (the entry supplies its own media). */
	skip?: boolean;
}

// ─── Relations to the library ──────────────────────────────────────────────

export interface ComponentLink {
	/** Registry slug — the only technical data stored here; props, imports and ports are derived. */
	slug: string;
	/** `exact`: this reference IS the component. `related`: a close match, explained in `note`. */
	relation: "exact" | "related";
	/** Required for `related`: one short sentence on how it differs. */
	note?: string;
}

// ─── The entry ─────────────────────────────────────────────────────────────

export interface Analysis {
	/** Two to four sentences about the visible behaviour. */
	why: string;
	/** When the pattern earns its place. */
	whenToUse: string;
	/** Touch, accessibility or motion-cost caveats. */
	watch: string;
	/** Implementation clues, 2–4 short items ("pointer distance → translate"). */
	clues: string[];
}

interface ReferenceBase {
	/** Stable id — the bookmark key. Never renamed once shipped. */
	id: string;
	/** URL segment of the detail page; unique; never "saved". */
	slug: string;
	/** "Object — behaviour", e.g. "Button — magnetic pull". */
	title: string;
	/** One line under the title. */
	summary: string;
	kind: Kind;
	/** Person or team behind the reference. */
	creator: string;
	/** Product or project the reference belongs to, when distinct from the creator. */
	product?: string;
	/** Where the reference lives; the "Visit source" link. */
	sourceUrl: string;
	/** ISO dates. `verifiedAt` is when a human last checked the source and the media. */
	addedAt: string;
	verifiedAt: string;
	status: Status;
	interactionTags: Interaction[];
	styleTags: Style[];
	useCaseTags: UseCase[];
	/**
	 * Framework the *source* is built with, when verified. A product screenshot
	 * usually has none — never infer React/Svelte/Vue from a look.
	 */
	sourceFramework?: Framework | "other";
	/** Frameworks a reusable implementation of the reference ships for, when verified. */
	implementationFrameworks?: Framework[];
	codeAvailability: CodeAvailability;
	analysis: Analysis;
	/** Position in the editorial selection: lower is earlier; omitted = unranked. */
	curatedRank?: number;
	collections?: Collection[];
	/** Library components this reference maps to; exact or related. */
	components: ComponentLink[];
	capture?: CaptureHints;
}

export interface FancyUIReference extends ReferenceBase {
	origin: "fancyui";
	/** The live specimen. Required: a FancyUI reference always runs for real. */
	demo: LiveDemo;
	/** Poster captured from the demo; filled by the media script, read from the manifest when absent. */
	media?: Media;
}

export interface ExternalReference extends ReferenceBase {
	origin: "external";
	/** Required to publish: an external card never ships without its own licensed media. */
	media?: Media;
	demo?: never;
}

export type Reference = FancyUIReference | ExternalReference;

export type { ControlDef, PlaygroundValues };
