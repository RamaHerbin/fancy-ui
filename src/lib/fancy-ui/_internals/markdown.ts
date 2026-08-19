/**
 * A deliberately small markdown reader for chat / assistant message surfaces.
 *
 * It produces a token tree, never a string of HTML: the renderer walks the
 * tokens with plain Svelte markup, so anything that is not an explicitly
 * supported construct ends up as escaped text instead of live markup.
 *
 * Supported: paragraphs, ATX headings, fenced code, flat lists, blockquotes,
 * thematic breaks, pipe tables, and inline strong / em / del / code / link.
 * Everything else (nested lists, setext headings, images, raw HTML, autolinks,
 * footnotes) degrades to text rather than being parsed.
 *
 * Every entry point is total: it returns a value for any input, including
 * half-written markdown from a stream.
 */

export type InlineToken =
	| { type: "text"; text: string }
	| { type: "code"; text: string }
	| { type: "strong" | "em" | "del"; children: InlineToken[] }
	| { type: "link"; href: string | null; children: InlineToken[] };

export type TableAlign = "left" | "center" | "right" | null;

export type BlockToken =
	| { type: "paragraph"; children: InlineToken[] }
	| { type: "heading"; depth: 1 | 2 | 3 | 4 | 5 | 6; children: InlineToken[] }
	| { type: "code"; lang: string; text: string }
	| { type: "list"; ordered: boolean; start: number; items: InlineToken[][] }
	| { type: "blockquote"; children: BlockToken[] }
	| { type: "table"; align: TableAlign[]; header: InlineToken[][]; rows: InlineToken[][][] }
	| { type: "hr" };

const ALLOWED_SCHEMES = new Set(["http", "https", "mailto"]);
const ESCAPABLE = "\\`*_{}[]()#+-.!>~|";
const MAX_INLINE_DEPTH = 12;
const MAX_BLOCK_DEPTH = 8;
// Scan bounds. Without them a crafted run of openers ("[[[[…]", "[a](" repeated)
// makes every bracket re-scan to end-of-input — quadratic on a parser that chat
// surfaces re-run on every streamed token. 999 is CommonMark's own label limit.
const MAX_LINK_LABEL = 999;
const MAX_LINK_DEST = 2048;
const MAX_INPUT = 100_000;

const RE_HR = /^ {0,3}-{3,}[ \t]*$/;
const RE_HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*))?$/;
const RE_QUOTE = /^ {0,3}>/;
const RE_QUOTE_STRIP = /^ {0,3}> ?/;
const RE_BULLET = /^ {0,3}([-*])(?:[ \t]+(.*))?$/;
const RE_ORDERED = /^ {0,3}(\d{1,9})[.)](?:[ \t]+(.*))?$/;
const RE_ALIGN_CELL = /^:?-+:?$/;

/**
 * Strips an ATX closing hash sequence ("## title ##" → "title") in linear time.
 * A regex here backtracks quadratically on crafted space/hash runs, which
 * matters because chat surfaces re-parse on every streamed token.
 */
function stripClosingHashes(raw: string): string {
	const content = raw.trimEnd();
	let end = content.length;
	while (end > 0 && content[end - 1] === "#") end--;
	if (end === content.length) return content;
	if (end === 0) return "";
	const before = content[end - 1];
	if (before === " " || before === "\t") return content.slice(0, end).trimEnd();
	return content;
}

/**
 * Returns a URL safe to put in an `href`, or `null` when the scheme is not one
 * we are willing to link to. Entities are never decoded first — a browser
 * decodes them after the attribute is set, so decoding here would let
 * `&#106;avascript:` through a check that the raw string fails.
 */
export function sanitizeHref(raw: string): string | null {
	if (typeof raw !== "string") return null;
	// A scheme can hide behind characters the URL parser ignores
	// ("java\nscript:"), so they go before the scheme is read.
	const cleaned = raw.replace(/^[\u0000-\u0020]+/, "").replace(/[\u0000-\u001F\u007F]/g, "");
	if (cleaned === "") return null;
	const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(cleaned);
	if (scheme && !ALLOWED_SCHEMES.has(scheme[1].toLowerCase())) return null;
	return cleaned;
}

/* -------------------------------------------------------------------------- */
/* Inline                                                                     */
/* -------------------------------------------------------------------------- */

export function parseInline(src: string): InlineToken[] {
	return parseInlineAt(typeof src === "string" ? src : "", 0, false);
}

/**
 * `inLink` is true while parsing a link's own label. CommonMark forbids a link
 * inside a link, and so does the DOM: nested `<a>` elements are repaired by the
 * HTML parser, so SSR markup and the client's hydration tree would disagree.
 */
function parseInlineAt(src: string, depth: number, inLink: boolean): InlineToken[] {
	if (src === "") return [];
	if (depth > MAX_INLINE_DEPTH) return [{ type: "text", text: src }];

	const out: InlineToken[] = [];
	let buf = "";
	let i = 0;

	// Monotonic caches of the next "]" / ")" at/after the cursor (-1 = none
	// ahead, -2 = not looked yet). A link can only succeed past a "]" AND a ")",
	// so floods of bare "[" or "[a](" cost one forward scan total instead of one
	// full label/destination scan per opener.
	let nextClose = -2;
	let nextParen = -2;
	function hasCloseAhead(from: number): boolean {
		if (nextClose === -1) return false;
		if (nextClose < from) nextClose = src.indexOf("]", from);
		return nextClose !== -1;
	}
	function hasParenAhead(from: number): boolean {
		if (nextParen === -1) return false;
		if (nextParen < from) nextParen = src.indexOf(")", from);
		return nextParen !== -1;
	}
	// Backtick run lengths that already failed to find a closer (see "`" branch).
	let failedSpanRuns: Set<number> | null = null;
	// End of the "*" run the cursor is currently inside. A run that opens no
	// emphasis is walked one character at a time, and counting the rest of the run
	// again at each step is quadratic — an 80k run of asterisks would stall the
	// thread. The cursor only moves forward, so one forward scan per run is enough.
	let starRunEnd = -1;
	function starRun(from: number): number {
		if (from >= starRunEnd) {
			let end = from;
			while (src[end] === "*") end++;
			starRunEnd = end;
		}
		return starRunEnd - from;
	}

	function flush() {
		if (buf !== "") {
			out.push({ type: "text", text: buf });
			buf = "";
		}
	}

	while (i < src.length) {
		const c = src[i];

		if (c === "\\" && i + 1 < src.length && ESCAPABLE.includes(src[i + 1])) {
			buf += src[i + 1];
			i += 2;
			continue;
		}

		if (c === "`") {
			let runEnd = i + 1;
			while (runEnd < src.length && src[runEnd] === "`") runEnd++;
			const runLen = runEnd - i;
			// A span can only open on a full backtick run, and a run length that
			// found no closer once will never find one later — so a failed run is
			// consumed whole and its length remembered, keeping bare-run floods
			// linear instead of one full rescan per backtick.
			if (!failedSpanRuns?.has(runLen)) {
				const span = matchCodeSpan(src, i);
				if (span) {
					flush();
					out.push({ type: "code", text: span.text });
					i = span.end;
					continue;
				}
				(failedSpanRuns ??= new Set()).add(runLen);
			}
			buf += src.slice(i, runEnd);
			i = runEnd;
			continue;
		}

		// Images are out of scope: keep the alt text, drop the reference.
		if (c === "!" && src[i + 1] === "[" && hasCloseAhead(i + 1) && hasParenAhead(i + 1)) {
			const image = matchLink(src, i + 1);
			if (image) {
				flush();
				out.push(...parseInlineAt(image.label, depth + 1, inLink));
				i = image.end;
				continue;
			}
		}

		// Inside a label the "[" falls through to text, which degrades the inner
		// link to its literal source rather than nesting an anchor.
		if (c === "[" && !inLink && hasCloseAhead(i) && hasParenAhead(i)) {
			const link = matchLink(src, i);
			if (link) {
				flush();
				out.push({
					type: "link",
					href: sanitizeHref(link.dest),
					children: parseInlineAt(link.label, depth + 1, true),
				});
				i = link.end;
				continue;
			}
		}

		if (c === "*") {
			const emphasis = matchEmphasis(src, i, starRun(i));
			if (emphasis) {
				flush();
				out.push({
					type: emphasis.strong ? "strong" : "em",
					children: parseInlineAt(emphasis.inner, depth + 1, inLink),
				});
				i = emphasis.end;
				continue;
			}
		}

		if (c === "~" && src[i + 1] === "~") {
			const close = findCloser(src, i + 2, "~~");
			if (close > i + 2) {
				flush();
				out.push({
					type: "del",
					children: parseInlineAt(src.slice(i + 2, close), depth + 1, inLink),
				});
				i = close + 2;
				continue;
			}
		}

		buf += c;
		i++;
	}

	flush();
	return out;
}

/** Length of the run of `ch` starting at `i`. */
function countRun(src: string, i: number, ch: string): number {
	let run = 0;
	while (src[i + run] === ch) run++;
	return run;
}

/** Index of the next `delim` at this nesting level, or -1. */
function findCloser(src: string, from: number, delim: string): number {
	let i = from;
	while (i < src.length) {
		const c = src[i];
		if (c === "\\") {
			i += 2;
			continue;
		}
		if (c === "`") {
			const span = matchCodeSpan(src, i);
			if (span) {
				i = span.end;
				continue;
			}
		}
		if (src.startsWith(delim, i)) return i;
		i++;
	}
	return -1;
}

function matchCodeSpan(src: string, i: number): { text: string; end: number } | null {
	let run = 0;
	while (src[i + run] === "`") run++;
	const open = i + run;
	let j = open;
	while (j < src.length) {
		if (src[j] !== "`") {
			j++;
			continue;
		}
		let close = 0;
		while (src[j + close] === "`") close++;
		if (close === run) return { text: normalizeCodeSpan(src.slice(open, j)), end: j + close };
		j += close;
	}
	return null;
}

function normalizeCodeSpan(raw: string): string {
	const text = raw.replace(/\r?\n/g, " ");
	if (text.length > 2 && text.startsWith(" ") && text.endsWith(" ") && text.trim() !== "") {
		return text.slice(1, -1);
	}
	return text;
}

function matchEmphasis(
	src: string,
	i: number,
	// Length of the "*" run starting at `i`. The caller already knows it while
	// walking a run, and recounting it here is what makes a long run quadratic.
	run = countRun(src, i, "*")
): { strong: boolean; inner: string; end: number } | null {
	if (run >= 3) {
		const close = findCloser(src, i + 3, "***");
		// Re-wrapping in single markers lets the recursive pass build em-in-strong.
		if (close > i + 3) {
			return { strong: true, inner: `*${src.slice(i + 3, close)}*`, end: close + 3 };
		}
	}
	if (run >= 2) {
		const close = findCloser(src, i + 2, "**");
		if (close > i + 2) return { strong: true, inner: src.slice(i + 2, close), end: close + 2 };
	}
	const close = findCloser(src, i + 1, "*");
	if (close > i + 1) return { strong: false, inner: src.slice(i + 1, close), end: close + 1 };
	return null;
}

function matchLink(src: string, i: number): { label: string; dest: string; end: number } | null {
	if (src[i] !== "[") return null;

	let bracket = 0;
	let j = i;
	let labelEnd = -1;
	while (j < src.length) {
		if (j - i > MAX_LINK_LABEL) return null;
		const c = src[j];
		if (c === "\\") {
			j += 2;
			continue;
		}
		if (c === "`") {
			const span = matchCodeSpan(src, j);
			if (span) {
				j = span.end;
				continue;
			}
		}
		if (c === "[") bracket++;
		else if (c === "]") {
			bracket--;
			if (bracket === 0) {
				labelEnd = j;
				break;
			}
		}
		j++;
	}
	if (labelEnd < 0 || src[labelEnd + 1] !== "(") return null;

	let k = labelEnd + 2;
	let paren = 1;
	let dest = "";
	while (k < src.length) {
		if (dest.length > MAX_LINK_DEST) return null;
		const c = src[k];
		if (c === "\n") return null;
		if (c === "\\" && k + 1 < src.length) {
			dest += src[k + 1];
			k += 2;
			continue;
		}
		if (c === "(") paren++;
		else if (c === ")") {
			paren--;
			if (paren === 0) break;
		}
		dest += c;
		k++;
	}
	if (paren !== 0) return null;

	return { label: src.slice(i + 1, labelEnd), dest: stripDestination(dest), end: k + 1 };
}

/** `url "title"` and `<url>` both reduce to the bare destination. */
function stripDestination(dest: string): string {
	const trimmed = dest.trim();
	const space = trimmed.search(/\s/);
	const url = space === -1 ? trimmed : trimmed.slice(0, space);
	if (url.length > 1 && url.startsWith("<") && url.endsWith(">")) return url.slice(1, -1);
	return url;
}

/* -------------------------------------------------------------------------- */
/* Blocks                                                                     */
/* -------------------------------------------------------------------------- */

export function parseMarkdown(src: string): BlockToken[] {
	if (typeof src !== "string" || src === "") return [];
	// Belt-and-braces bound for adversarial vectors nobody has found yet: a chat
	// message beyond this size is truncated rather than allowed to own the main
	// thread. Consumers with genuinely huge documents should chunk upstream.
	const bounded = src.length > MAX_INPUT ? src.slice(0, MAX_INPUT) : src;
	return parseBlocks(bounded.split(/\r\n|\r|\n/), 0);
}

function parseBlocks(lines: string[], depth: number): BlockToken[] {
	const out: BlockToken[] = [];
	if (depth > MAX_BLOCK_DEPTH) {
		const text = lines.join("\n").trim();
		if (text !== "") out.push({ type: "paragraph", children: parseInline(text) });
		return out;
	}

	let i = 0;
	while (i < lines.length) {
		const line = lines[i];

		if (line.trim() === "") {
			i++;
			continue;
		}

		const fence = matchFence(line);
		if (fence) {
			const body: string[] = [];
			i++;
			// An unterminated fence stays open — the common case mid-stream.
			while (i < lines.length && !isFenceClose(lines[i], fence.width)) {
				body.push(lines[i]);
				i++;
			}
			if (i < lines.length) i++;
			out.push({ type: "code", lang: fence.lang, text: body.join("\n") });
			continue;
		}

		if (RE_HR.test(line)) {
			out.push({ type: "hr" });
			i++;
			continue;
		}

		const heading = RE_HEADING.exec(line);
		if (heading) {
			const content = stripClosingHashes(heading[2] ?? "");
			out.push({
				type: "heading",
				depth: heading[1].length as 1 | 2 | 3 | 4 | 5 | 6,
				children: parseInline(content),
			});
			i++;
			continue;
		}

		if (RE_QUOTE.test(line)) {
			const inner: string[] = [];
			while (i < lines.length && RE_QUOTE.test(lines[i])) {
				inner.push(lines[i].replace(RE_QUOTE_STRIP, ""));
				i++;
			}
			out.push({ type: "blockquote", children: parseBlocks(inner, depth + 1) });
			continue;
		}

		const table = matchTable(lines, i);
		if (table) {
			out.push(table.token);
			i = table.end;
			continue;
		}

		const list = matchList(lines, i);
		if (list) {
			out.push(list.token);
			i = list.end;
			continue;
		}

		const parts = [line.trim()];
		i++;
		while (i < lines.length && lines[i].trim() !== "" && !startsBlock(lines, i)) {
			parts.push(lines[i].trim());
			i++;
		}
		out.push({ type: "paragraph", children: parseInline(parts.join("\n")) });
	}

	return out;
}

function startsBlock(lines: string[], i: number): boolean {
	const line = lines[i];
	return (
		matchFence(line) !== null ||
		RE_HR.test(line) ||
		RE_HEADING.test(line) ||
		RE_QUOTE.test(line) ||
		matchListItem(line) !== null ||
		isTableStart(lines, i)
	);
}

function matchFence(line: string): { width: number; lang: string } | null {
	const m = /^ {0,3}(`{3,})(.*)$/.exec(line);
	// A backtick in the info string means this is not a fence at all.
	if (!m || m[2].includes("`")) return null;
	const lang = (m[2].trim().split(/\s+/)[0] ?? "").replace(/[^a-zA-Z0-9_+#.-]/g, "").slice(0, 32);
	return { width: m[1].length, lang };
}

function isFenceClose(line: string, width: number): boolean {
	const m = /^ {0,3}(`{3,})[ \t]*$/.exec(line);
	return m !== null && m[1].length >= width;
}

function matchListItem(line: string): { ordered: boolean; start: number; content: string } | null {
	if (RE_HR.test(line)) return null;
	const bullet = RE_BULLET.exec(line);
	if (bullet) return { ordered: false, start: 1, content: bullet[2] ?? "" };
	const ordered = RE_ORDERED.exec(line);
	if (ordered) {
		return { ordered: true, start: Number.parseInt(ordered[1], 10), content: ordered[2] ?? "" };
	}
	return null;
}

function matchList(lines: string[], from: number): { token: BlockToken; end: number } | null {
	const first = matchListItem(lines[from]);
	if (!first) return null;

	const ordered = first.ordered;
	const items: InlineToken[][] = [];
	let raw = [first.content];
	let i = from + 1;

	while (i < lines.length) {
		const line = lines[i];

		if (line.trim() === "") {
			const next = i + 1 < lines.length ? matchListItem(lines[i + 1]) : null;
			if (next && next.ordered === ordered) {
				i++;
				continue;
			}
			break;
		}

		// Deeper indentation is not a level of its own here: an item is an item.
		const item = matchListItem(line);
		if (item) {
			if (item.ordered !== ordered) break;
			items.push(parseInline(raw.join("\n")));
			raw = [item.content];
			i++;
			continue;
		}

		if (startsBlock(lines, i)) break;
		raw.push(line.trim());
		i++;
	}

	items.push(parseInline(raw.join("\n")));
	return { token: { type: "list", ordered, start: first.start, items }, end: i };
}

function parseAlignRow(line: string | undefined): TableAlign[] | null {
	if (line === undefined || !line.includes("|") || !line.includes("-")) return null;
	const cells = splitTableRow(line);
	const align: TableAlign[] = [];
	for (const cell of cells) {
		if (!RE_ALIGN_CELL.test(cell)) return null;
		const left = cell.startsWith(":");
		const right = cell.endsWith(":");
		align.push(left && right ? "center" : right ? "right" : left ? "left" : null);
	}
	return align.length > 0 ? align : null;
}

function isTableStart(lines: string[], i: number): boolean {
	const line = lines[i];
	if (!line.includes("|")) return false;
	const align = parseAlignRow(lines[i + 1]);
	return align !== null && splitTableRow(line).length === align.length;
}

function matchTable(lines: string[], from: number): { token: BlockToken; end: number } | null {
	if (!isTableStart(lines, from)) return null;

	const align = parseAlignRow(lines[from + 1]) as TableAlign[];
	const header = splitTableRow(lines[from]).map((cell) => parseInline(cell));
	const rows: InlineToken[][][] = [];
	let i = from + 2;

	while (i < lines.length) {
		const line = lines[i];
		if (line.trim() === "" || !line.includes("|")) break;
		if (matchFence(line) || RE_HEADING.test(line) || RE_QUOTE.test(line)) break;
		const cells = splitTableRow(line);
		rows.push(align.map((_, c) => parseInline(cells[c] ?? "")));
		i++;
	}

	return { token: { type: "table", align, header, rows }, end: i };
}

function splitTableRow(line: string): string[] {
	let s = line.trim();
	if (s.startsWith("|")) s = s.slice(1);
	if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);

	const cells: string[] = [];
	let cell = "";
	for (let i = 0; i < s.length; i++) {
		const c = s[i];
		if (c === "\\" && s[i + 1] === "|") {
			cell += "|";
			i++;
			continue;
		}
		if (c === "|") {
			cells.push(cell.trim());
			cell = "";
			continue;
		}
		cell += c;
	}
	cells.push(cell.trim());
	return cells;
}
