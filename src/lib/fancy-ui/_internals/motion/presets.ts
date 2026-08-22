/**
 * The single source of preset GEOMETRY for the motion family — what moves,
 * and how far, for each named look. Two consumers read this table for two
 * different purposes: Reveal's CSS (hand-written `<style>` rules keyed on
 * `data-preset`, built to match this table by hand) and `transitions.ts`'s
 * `preset()` (which reads this table directly at runtime to build a Svelte
 * `TransitionConfig`). Keeping the numbers in exactly one place is the
 * whole point of this file existing separately from `transitions.ts` — a
 * geometry change here is the one edit that keeps both in sync in theory,
 * even though Reveal's CSS side still has to be updated by hand (this repo
 * ships no shared runtime stylesheet; see `tokens.ts`'s header comment for
 * the same caveat applied to durations/easings).
 */

export type PresetName =
	| "fade"
	| "fade-up"
	| "fade-down"
	| "fade-left"
	| "fade-right"
	| "scale"
	| "blur"
	| "zoom";

/** Reveal never offers `blur`/`zoom` — a per-child `filter` is expensive
 * enough (forces paint, not just compositing) that the contract keeps it
 * opt-in to a single root (Presence), not something an arbitrary-length
 * list of children can each carry. */
export type RevealPresetName = Exclude<PresetName, "blur" | "zoom">;

export const PRESET_NAMES: readonly PresetName[] = [
	"fade",
	"fade-up",
	"fade-down",
	"fade-left",
	"fade-right",
	"scale",
	"blur",
	"zoom",
];

/**
 * `x`/`y`: the SIGN of the travel axis, multiplied by a caller-supplied
 * `distance` (px) at the consuming site — `1` and `-1`, never a raw pixel
 * value, so one `distance` prop scales every directional preset the same
 * way. `scale`/`blur`: the value at the HIDDEN end of the transition (t=0);
 * the visible end (t=1) is always the resting `scale(1)` / `blur(0)`.
 */
export interface PresetGeometry {
	x?: -1 | 1;
	y?: -1 | 1;
	scale?: number;
	blur?: number;
}

export const PRESETS: Record<PresetName, PresetGeometry> = {
	fade: {},
	"fade-up": { y: 1 }, // hidden state sits BELOW rest (+y), travels up into place
	"fade-down": { y: -1 }, // hidden state sits ABOVE rest (-y), travels down into place
	"fade-left": { x: 1 },
	"fade-right": { x: -1 },
	scale: { scale: 0.92 }, // floor per the creative direction — never smaller
	blur: { blur: 8 }, // px; the one Reveal-excluded preset that is opacity+filter only
	zoom: { scale: 0.85, blur: 12 }, // Presence's deepest preset — scale floor + filter combined
};
