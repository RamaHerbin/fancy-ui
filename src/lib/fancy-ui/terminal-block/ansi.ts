/**
 * A deliberately small ANSI reader for terminal output surfaces.
 *
 * It produces an array of styled segments, never a string of HTML: the renderer
 * walks the segments with plain Svelte markup, so escape sequences can only ever
 * become styling or nothing at all — never markup.
 *
 * Supported: SGR reset (`0`), bold (`1`), and the eight foreground colours in
 * both their normal (`30`–`37`) and bright (`90`–`97`) ranges, alone or
 * compounded (`ESC[1;32m`). Everything else — cursor moves, erase sequences,
 * OSC titles, background colours, 256/truecolour, unknown SGR parameters — is
 * stripped without leaving a trace in the text.
 *
 * Every entry point is total: it returns a value for any input, including a
 * half-written escape sequence at the end of a stream.
 */

/** A run of text sharing one set of attributes. */
export interface AnsiSegment {
	/** The text itself, with every escape sequence already removed. */
	text: string;
	/** Whether SGR bold is in effect for this run. */
	bold: boolean;
	/** Name of the CSS custom property holding the colour, or null for the default. */
	fg: string | null;
}

/** The eight colour names the SGR foreground codes map onto. */
export const ANSI_COLORS = [
	"black",
	"red",
	"green",
	"yellow",
	"blue",
	"magenta",
	"cyan",
	"white",
] as const;

export type AnsiColor = (typeof ANSI_COLORS)[number];

const ESC = "\u001b";
const BEL = "\u0007";

/** CSI parameter bytes, per ECMA-48: `0-9 : ; < = > ?`. */
const PARAM_MIN = 0x30;
const PARAM_MAX = 0x3f;
/** CSI/escape intermediate bytes: space through `/`. */
const INTERMEDIATE_MIN = 0x20;
const INTERMEDIATE_MAX = 0x2f;

/**
 * Bright codes reuse the same eight variables rather than doubling the palette:
 * on a dark surface the "normal" set is already the readable one.
 */
function fgVar(code: number): string | null {
	if (code >= 30 && code <= 37) return `--ft-terminal-${ANSI_COLORS[code - 30]}`;
	if (code >= 90 && code <= 97) return `--ft-terminal-${ANSI_COLORS[code - 90]}`;
	return null;
}

interface Sgr {
	bold: boolean;
	fg: string | null;
}

function applySgr(params: string, state: Sgr): void {
	for (const part of params.split(";")) {
		// An omitted parameter means 0, so `ESC[m` and `ESC[;32m` both behave.
		const code = part === "" ? 0 : Number(part);
		if (!Number.isInteger(code)) continue;
		if (code === 0) {
			state.bold = false;
			state.fg = null;
			continue;
		}
		if (code === 1) {
			state.bold = true;
			continue;
		}
		const colour = fgVar(code);
		if (colour !== null) state.fg = colour;
	}
}

/** Split a chunk of terminal output into styled runs. Never throws. */
export function parseAnsi(src: string): AnsiSegment[] {
	if (typeof src !== "string" || src.length === 0) return [];
	// Most lines of output carry no styling at all.
	if (!src.includes(ESC)) return [{ text: src, bold: false, fg: null }];

	const out: AnsiSegment[] = [];
	const state: Sgr = { bold: false, fg: null };
	let buf = "";
	let i = 0;

	function flush(): void {
		if (buf === "") return;
		// A stripped sequence (a cursor move mid-line, say) splits the buffer
		// without changing the attributes; those two runs are one run.
		const last = out[out.length - 1];
		if (last !== undefined && last.bold === state.bold && last.fg === state.fg) {
			last.text += buf;
		} else {
			out.push({ text: buf, bold: state.bold, fg: state.fg });
		}
		buf = "";
	}

	while (i < src.length) {
		if (src[i] !== ESC) {
			buf += src[i];
			i += 1;
			continue;
		}

		flush();
		const next = src[i + 1];

		if (next === "[") {
			// CSI: parameter bytes, then intermediates, then exactly one final byte.
			let j = i + 2;
			while (j < src.length && src.charCodeAt(j) >= PARAM_MIN && src.charCodeAt(j) <= PARAM_MAX) {
				j += 1;
			}
			const params = src.slice(i + 2, j);
			while (
				j < src.length &&
				src.charCodeAt(j) >= INTERMEDIATE_MIN &&
				src.charCodeAt(j) <= INTERMEDIATE_MAX
			) {
				j += 1;
			}
			// Truncated mid-sequence: the rest of the stream is escape, not text.
			if (j >= src.length) break;
			if (src[j] === "m") applySgr(params, state);
			i = j + 1;
			continue;
		}

		if (next === "]") {
			// OSC: a string terminated by BEL or ST, or by the end of the stream.
			let j = i + 2;
			while (j < src.length) {
				if (src[j] === BEL) {
					j += 1;
					break;
				}
				if (src[j] === ESC && src[j + 1] === "\\") {
					j += 2;
					break;
				}
				j += 1;
			}
			i = j;
			continue;
		}

		// A lone ESC at the very end has nothing left to introduce.
		if (next === undefined) break;

		// Two- and three-byte escapes: optional intermediates, then one final byte.
		let j = i + 1;
		while (
			j < src.length &&
			src.charCodeAt(j) >= INTERMEDIATE_MIN &&
			src.charCodeAt(j) <= INTERMEDIATE_MAX
		) {
			j += 1;
		}
		i = j < src.length ? j + 1 : src.length;
	}

	flush();
	return out;
}
