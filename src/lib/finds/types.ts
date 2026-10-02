/**
 * Finds — the data shape behind /finds, a gallery of UI interactions worth
 * studying. Two kinds of entry share one card: a *live* find runs a real
 * library component inside the card (optionally retunable through knobs),
 * an *external* find points at an interaction somewhere else on the web.
 *
 * App-side only: nothing under `src/lib/finds/` is published to npm
 * (`files` in package.json whitelists `dist/fancy-ui` and friends).
 */

import type { ControlDef, PlaygroundValues } from "$lib/components/PropsPlayground.svelte";

/**
 * What the visitor does to see the interaction. This is the one axis the
 * gallery filters on; techniques (magnetic, spring, morph, parallax…) are
 * free-form `tags` and stay searchable. `ambient` means the visitor does
 * nothing — the card moves on its own.
 */
export const GESTURES = ["hover", "press", "drag", "type", "select", "scroll", "ambient"] as const;

export type Gesture = (typeof GESTURES)[number];

export const GESTURE_LABELS: Record<Gesture, string> = {
	hover: "Hover",
	press: "Press",
	drag: "Drag",
	type: "Type",
	select: "Select",
	scroll: "Scroll",
	ambient: "Ambient",
};

interface FindBase {
	/** Unique kebab-case id — bookmark key and, for live finds, the demo module name. */
	id: string;
	/** "Object — gesture", e.g. "Button — magnetic pull". */
	title: string;
	gesture: Gesture;
	/** One line: the design-engineer reading — what makes the interaction good. */
	why: string;
	/** Implementation clues, 2–4 short items ("pointer distance → translate"). */
	clues: string[];
	/** Technique vocabulary for search: magnetic, spring, morph, webgl… */
	tags: string[];
	/** ISO date the find was added; newest first in the grid. */
	added: string;
	/** Pinned to the top of the grid regardless of date. */
	featured?: boolean;
}

export interface LiveFind extends FindBase {
	kind: "live";
	/** Registry slug — the ↗ link goes to /docs/components/<slug>. */
	slug: string;
	/** Demo module id → src/lib/finds/demos/<demo>.svelte */
	demo: string;
	/** Tune panel controls; omitted = the card has no tune button. */
	knobs?: ControlDef[];
	/** Values the demo starts with (every knob key must be present). */
	defaults?: PlaygroundValues;
	/**
	 * When the demo mounts. `near` (default): as soon as the card approaches
	 * the viewport. `intent`: only after the visitor's first pointer/focus on
	 * the stage — for WebGL/canvas demos, so a page of them does not open a
	 * context per card at once.
	 */
	mount?: "near" | "intent";
}

export interface ExternalFind extends FindBase {
	kind: "external";
	/** Where the interaction lives. The name is shown, the URL is the ↗ link. */
	source: { name: string; url: string };
	/**
	 * Optional media served from static/finds/. Never copied from a third
	 * party's site; without media the card renders as a typographic study card.
	 */
	media?: { type: "video" | "image"; src: string; poster?: string; alt: string };
}

export type Find = LiveFind | ExternalFind;

export type { ControlDef, PlaygroundValues };
