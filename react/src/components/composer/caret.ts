/**
 * Caret arithmetic and caret geometry for the composer's trigger menus.
 *
 * Two jobs, one file, because a completion menu needs both at the same moment:
 * *what* the reader is typing after a trigger character, and *where* on screen
 * that trigger sits so the menu can be pinned to it.
 *
 * `findTokenStart` and `findTriggerToken` are pure — no DOM, no globals,
 * exhaustively testable. `measureCaretRect` has to touch the DOM, since a
 * textarea exposes no caret geometry of its own: the only way to find out where
 * character *n* landed is to lay the same text out again in an element that can
 * be measured.
 */

import type { FloatRect } from "../../internals/float.js";

/** The trigger token the caret currently sits in. */
export interface TriggerToken {
	/** Index of the trigger character itself, within the value. */
	start: number;
	/** Everything typed between the trigger and the caret. Empty right after the trigger. */
	query: string;
}

/** True when `index` falls between the two halves of a surrogate pair. */
function splitsPair(value: string, index: number): boolean {
	const high = value.charCodeAt(index - 1);
	const low = value.charCodeAt(index);
	return high >= 0xd800 && high <= 0xdbff && low >= 0xdc00 && low <= 0xdfff;
}

/**
 * The caret, brought inside the value and onto a code point boundary.
 *
 * Rounding a mid-pair caret down is what keeps every index the token search
 * hands back — and therefore every slice taken from it — from cutting a
 * character in half.
 */
function tokenEnd(value: string, caret: number): number {
	const end = Math.max(0, Math.min(caret, value.length));
	return end > 0 && end < value.length && splitsPair(value, end) ? end - 1 : end;
}

/**
 * Where the trigger token under `caret` starts, or -1 when there is none.
 *
 * This is *the* definition of a trigger token, and the only one: both the menus
 * that open on a token and the `insertText` that replaces one measure it here,
 * so the span a menu matched and the span a completion overwrites can never
 * drift apart.
 *
 * The token is the whitespace-delimited run ending at the caret, and it counts
 * as a trigger only when it opens with something other than a letter or a digit.
 * That deliberately avoids a hardcoded trigger vocabulary: `/`, `@`, `#`, `:`
 * and whatever a menu invents all behave the same, while an ordinary word — or a
 * `/` sitting mid-word, as in a path fragment — does not.
 *
 * The walk counts code points rather than code units. Reading one unit would
 * mistake the leading half of an astral character for a non-alphanumeric and
 * swallow the whole word: `𝐀𝐁` is two letters, not a trigger token, and a caret
 * the platform dropped between two halves belongs to the character as a whole.
 */
export function findTokenStart(value: string, caret: number): number {
	const end = tokenEnd(value, caret);

	let start = end;
	while (start > 0) {
		const step = splitsPair(value, start - 1) ? 2 : 1;
		if (/\s/u.test(value.slice(start - step, start))) break;
		start -= step;
	}

	// The caret sits at the very start of a word boundary: there is no token.
	if (start === end) return -1;
	const first = String.fromCodePoint(value.codePointAt(start) as number);
	return /[\p{L}\p{N}]/u.test(first) ? -1 : start;
}

/**
 * The trigger token under `caret`, or `null` when there is none.
 *
 * The same run `findTokenStart` reports, narrowed to the menus that own it: the
 * run has to open with the exact `trigger` string. So `/de` and `@jo` open their
 * own menu and nobody else's; `src/lib` opens neither, because its slash is
 * mid-word, and neither does a caret sitting before the trigger it would
 * otherwise match.
 *
 * The token deliberately ends *at the caret* rather than at the end of the word:
 * completing `@jo|rdan` should search for `jo`, which is what the reader has
 * actually committed to.
 */
export function findTriggerToken(
	value: string,
	caret: number,
	trigger: string
): TriggerToken | null {
	if (trigger === "") return null;

	const end = tokenEnd(value, caret);
	const start = findTokenStart(value, end);
	if (start < 0) return null;

	const token = value.slice(start, end);
	// Also covers a trigger only half typed: `:` is not yet `::`.
	if (!token.startsWith(trigger)) return null;
	return { start, query: token.slice(trigger.length) };
}

/** Copied onto the mirror so it wraps text exactly the way the textarea does. */
const MIRRORED_STYLES = [
	"border-bottom-width",
	"border-left-width",
	"border-right-width",
	"border-top-width",
	"direction",
	"font-family",
	"font-size",
	"font-stretch",
	"font-style",
	"font-variant",
	"font-weight",
	"letter-spacing",
	"line-height",
	"padding-bottom",
	"padding-left",
	"padding-right",
	"padding-top",
	"tab-size",
	"text-align",
	"text-indent",
	"text-transform",
	"word-spacing",
] as const;

/** Used when the platform reports no usable line-height, e.g. under jsdom. */
const FALLBACK_LINE_HEIGHT = 20;
/** Multiplier applied to the font size when only that is measurable. */
const NORMAL_LINE_RATIO = 1.5;

function px(input: string): number {
	const parsed = Number.parseFloat(input);
	return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Where character `index` of a textarea sits, in viewport coordinates.
 *
 * The mirror-div technique: a hidden div inherits the textarea's font, padding,
 * borders and content width, receives the text up to `index`, and then a marker
 * span holding the rest. The span's offset is the caret's offset, because the
 * two layouts are the same layout. The rest is bookkeeping — the textarea's own
 * position, its border, and how far it has been scrolled.
 *
 * Returns a zero-width rect one line tall, which is exactly what a float wants
 * as a virtual anchor. Under jsdom nothing has a layout, so everything measures
 * zero; the shape still holds and nothing throws.
 */
export function measureCaretRect(textarea: HTMLTextAreaElement, index: number): FloatRect {
	const box = textarea.getBoundingClientRect();
	const doc = textarea.ownerDocument;
	const win = doc.defaultView;
	if (!win) return { x: box.left, y: box.top, width: 0, height: box.height };

	const style = win.getComputedStyle(textarea);
	const declaredLine = Number.parseFloat(style.lineHeight);
	const fontSize = Number.parseFloat(style.fontSize);
	const line =
		Number.isFinite(declaredLine) && declaredLine > 0
			? declaredLine
			: Number.isFinite(fontSize) && fontSize > 0
				? fontSize * NORMAL_LINE_RATIO
				: FALLBACK_LINE_HEIGHT;

	const mirror = doc.createElement("div");
	for (const property of MIRRORED_STYLES) {
		mirror.style.setProperty(property, style.getPropertyValue(property));
	}
	// Content-box on purpose: `clientWidth` already excludes the borders and the
	// scrollbar, so subtracting the padding leaves the exact width the text wraps
	// inside — no double counting whichever box model the textarea itself uses.
	const inner = textarea.clientWidth || box.width;
	mirror.style.boxSizing = "content-box";
	mirror.style.width = `${Math.max(0, inner - px(style.paddingLeft) - px(style.paddingRight))}px`;
	mirror.style.height = "auto";
	mirror.style.position = "absolute";
	mirror.style.top = "0";
	mirror.style.left = "-9999px";
	mirror.style.visibility = "hidden";
	mirror.style.overflow = "hidden";
	// A textarea wraps on soft breaks and breaks long words rather than scrolling
	// sideways; the mirror has to agree or the two layouts drift apart.
	mirror.style.whiteSpace = "pre-wrap";
	mirror.style.overflowWrap = "break-word";

	const value = textarea.value;
	const clamped = Math.max(0, Math.min(index, value.length));
	mirror.textContent = value.slice(0, clamped);

	const marker = doc.createElement("span");
	// The remainder, so the span occupies a real line box; a trailing caret has
	// nothing left to hold it open, hence the dot.
	marker.textContent = value.slice(clamped) || ".";
	mirror.appendChild(marker);

	doc.body.appendChild(mirror);
	let top = 0;
	let left = 0;
	try {
		top = marker.offsetTop;
		left = marker.offsetLeft;
	} finally {
		mirror.remove();
	}

	// `offsetTop` is measured from the mirror's padding edge, so it already carries
	// the padding; only the border is left to add back.
	return {
		x: box.left + px(style.borderLeftWidth) + left - textarea.scrollLeft,
		y: box.top + px(style.borderTopWidth) + top - textarea.scrollTop,
		width: 0,
		height: line,
	};
}
