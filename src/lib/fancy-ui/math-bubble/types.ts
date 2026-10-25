import type { BubbleKind, TailSide } from "./handwrite-bubble.js";

export type MathBubbleKind = BubbleKind;
export type MathBubbleTail = TailSide;
export type MathBubbleTrigger = "inView" | "mount" | "manual";

export interface MathBubbleProps {
	/**
	 * The formula, in a small TeX subset (`^`, `_`, `\frac`, `\sqrt`, Greek letters). An array is
	 * written one formula after the other; with `loop` it cycles.
	 */
	formula: string | string[];
	/** Outline drawn around the formula. Default `"speech"`. */
	bubble?: MathBubbleKind;
	/** Side the tail points to. Default `"bottom"`. */
	tail?: MathBubbleTail;
	/** Where the tail leaves its side, 0..1. Default `0.25`. */
	tailOffset?: number;
	/** Writing speed, em per second. Default `5`. */
	speed?: number;
	/** Seed of the hand: the same seed always draws the same strokes. Default `1`. */
	seed?: number;
	/** Pixels per em. Default `32`. */
	size?: number;
	/** Base pen width, px. Default `2.2`. */
	strokeWidth?: number;
	/** Ink colour. `"currentColor"` follows the text colour. Default `"currentColor"`. */
	ink?: string;
	/** When the drawing starts. Default `"inView"`. */
	trigger?: MathBubbleTrigger;
	/** Start again after the last formula. Default `false`. */
	loop?: boolean;
	/** Rest on a finished formula before the next one, ms. Default `1800`. */
	hold?: number;
	/** Accessible name. Defaults to the formula text. */
	ariaLabel?: string;
	/**
	 * Renders one still at this time (ms since the start) with no animation loop: for screenshots
	 * and hidden tabs.
	 */
	t?: number;
	/** Additional CSS classes on the wrapper. */
	class?: string;
	/** Called when the last formula is written (once per pass when looping). */
	onComplete?: () => void;
}
