import { describe, it, expect } from "vitest";
import { parseMarkdown, parseInline, sanitizeHref } from "./markdown.js";

/*
 * The rendered-DOM half of this suite (the `<Markdown>` / `<MarkdownInline>`
 * component tests) belongs to the Wave-2 components unit. Everything here
 * exercises the parser directly.
 */

function timeParse(src: string): number {
	// Warm once, then take the best of three: single sub-millisecond parses are
	// JIT- and GC-noisy. Budgets below are absolute and generous — the quadratic
	// versions of these vectors cost seconds, the bounded parser costs
	// milliseconds — so loaded CI runners stay comfortably inside them.
	parseMarkdown(src);
	let best = Infinity;
	for (let run = 0; run < 3; run++) {
		const t0 = performance.now();
		parseMarkdown(src);
		best = Math.min(best, performance.now() - t0);
	}
	return best;
}

/**
 * Re-parses every prefix of `src`, the way a chat surface re-renders a message
 * as it streams in, and returns the best of three runs.
 */
function timeStream(src: string): number {
	let best = Infinity;
	for (let run = 0; run < 3; run++) {
		const t0 = performance.now();
		for (let i = 1; i <= src.length; i += 1) parseMarkdown(src.slice(0, i));
		best = Math.min(best, performance.now() - t0);
	}
	return best;
}

/**
 * How much more a streamed adversarial input may cost than streaming the same
 * number of ordinary characters.
 *
 * These assertions used to be absolute — "this replay must finish under a
 * second" — which is the real product requirement (a streaming message must
 * not block the main thread) but is not a property of the parser. It is a
 * property of the parser *and the machine*, and CI runners are shared and
 * several times slower than a laptop. The absolute form failed roughly one run
 * in two here, on unchanged code, and no larger constant fixes that: a bigger
 * number just moves the coin-flip.
 *
 * What CI can prove without knowing the hardware is the shape of the growth.
 * A vector whose per-parse cost stops being linear in its input turns this
 * replay super-linear, which shows up as a ratio that grows with the input
 * rather than sitting at a constant — a slow runner scales both sides of the
 * division equally and cancels out.
 *
 * The ceiling is calibrated, not guessed. Streaming every structure the parser
 * treats specially — bracket runs, closed labels, nested labels, links,
 * emphasis pairs, code spans — costs between 1.0x and 3.9x plain text of the
 * same length on this machine. 12 is roughly three times the worst legitimate
 * case, which absorbs a noisy runner, and still an order of magnitude below
 * what an unbounded scan would produce: by this file's own record, the
 * link-opener regression it was written for took the 2KB replay past a second,
 * against a measured ~9ms baseline for that length.
 *
 * A wall-clock ceiling still belongs somewhere — a benchmark on known
 * hardware, not a correctness gate that any PR can trip by being unlucky.
 */
const MAX_STREAM_RATIO = 12;

/** Streams the same number of ordinary characters, as the yardstick for the ratio. */
function timeBaselineStream(length: number): number {
	return timeStream("a".repeat(length));
}

describe("DoS: adversarial parse cost stays bounded", () => {
	const BUDGET_MS = 250;

	/**
	 * The streaming tests measure ~24k parses each (3 runs × every prefix,
	 * plus the same again for the baseline). The ratio assertion is
	 * machine-independent, but the measurement itself is not — on a loaded CI
	 * runner it can outlast vitest's default 5s test timeout, which fails the
	 * test without ever reaching the assertion. Slow measurement is not a
	 * finding; only the ratio is.
	 */
	const STREAM_MEASURE_TIMEOUT = { timeout: 60_000 };

	it("unclosed bracket run", () => {
		expect(timeParse("[".repeat(80_000))).toBeLessThan(BUDGET_MS);
	});

	it("bracket run with a single closer (label-scan bound)", () => {
		expect(timeParse("[".repeat(40_000) + "]")).toBeLessThan(BUDGET_MS);
	});

	it("link-opener flood (destination-scan bound)", () => {
		expect(timeParse("[a](".repeat(8_000))).toBeLessThan(BUDGET_MS);
	});

	it("inline backtick run (must not start the line: a fence would swallow it)", () => {
		expect(timeParse("x" + "`".repeat(80_000))).toBeLessThan(BUDGET_MS);
	});

	it("distinct-length backtick runs", () => {
		let src = "x";
		for (let len = 1; len < 400; len++) src += "a" + "`".repeat(len);
		expect(timeParse(src)).toBeLessThan(BUDGET_MS);
	});

	it("unmatched emphasis run", () => {
		expect(timeParse("x" + "*".repeat(80_000))).toBeLessThan(BUDGET_MS);
	});

	it("emphasis runs of every length", () => {
		let src = "x";
		for (let len = 1; len < 400; len++) src += "a" + "*".repeat(len);
		expect(timeParse(src)).toBeLessThan(BUDGET_MS);
	});

	it("streaming re-parse of an emphasis run", STREAM_MEASURE_TIMEOUT, () => {
		const full = "x" + "*".repeat(4_000);
		const ratio = timeStream(full) / timeBaselineStream(full.length);
		expect(ratio).toBeLessThan(MAX_STREAM_RATIO);
	});

	it("heading with space/hash tail", () => {
		expect(timeParse(`# a${" ".repeat(80_000)}${"#".repeat(80_000)}x`)).toBeLessThan(BUDGET_MS);
	});

	it("oversized input is truncated, not parsed whole", () => {
		const blocks = parseMarkdown("a\n\n".repeat(200_000));
		expect(blocks.length).toBeLessThanOrEqual(50_001);
	});

	it("streaming re-parse of a bracket run (what a chat surface actually does)", STREAM_MEASURE_TIMEOUT, () => {
		const full = "[".repeat(4_000);
		const ratio = timeStream(full) / timeBaselineStream(full.length);
		expect(ratio).toBeLessThan(MAX_STREAM_RATIO);
	});

	it("streaming re-parse of an ordinary-sized link-opener message", STREAM_MEASURE_TIMEOUT, () => {
		// 2KB of "[a](" looks like a benign reply; unbounded destination scans
		// made this exact replay block the main thread for over a second.
		const full = "[a](".repeat(500);
		const ratio = timeStream(full) / timeBaselineStream(full.length);
		expect(ratio).toBeLessThan(MAX_STREAM_RATIO);
	});
});

describe("sanitizeHref: uncovered bypass attempts", () => {
	// Control characters in these payloads are written as escapes, never as the
	// raw byte. Two raw NULs used to live in this list, and a NUL anywhere in
	// the first 8KB makes git classify the whole file as binary — so every diff
	// of it rendered as "Bin 8443 -> 10664 bytes" and could not be reviewed.
	// A security test nobody can read the diff of is the one place that matters
	// most: a payload could be weakened to a string that no longer probes
	// anything and the change would be invisible in review.
	it("rejects every non-allowlisted scheme", () => {
		for (const url of [
			"blob:https://x/y",
			"file:///etc/passwd",
			"vbscript:x",
			"data:text/html;base64,PHNjcmlwdD4=",
			"jAvAsCrIpT:alert(1)",
			"\u0000javascript:alert(1)",
			"javascript\u0000:alert(1)",
			"javascript:alert(1)",
			"javascript:alert(1)",
			"javascript:alert(1)",
		]) {
			expect(sanitizeHref(url), url).toBeNull();
		}
	});

	it("does not decode entities into a live scheme", () => {
		expect(sanitizeHref("javascript&colon;alert(1)")).toBe("javascript&colon;alert(1)");
		expect(sanitizeHref("&#106;avascript:alert(1)")).toBe("&#106;avascript:alert(1)");
	});

	it("does not let a backslash escape smuggle a scheme past the check", () => {
		expect(parseInline("[x](java\\script:alert(1))")[0]).toMatchObject({ href: null });
		expect(parseInline("[x](<javascript:alert(1)>)")[0]).toMatchObject({ href: null });
		expect(parseInline("[x](java\\\nscript:alert(1))")[0]).not.toMatchObject({
			href: expect.stringContaining("javascript:"),
		});
	});

	it("non-ASCII whitespace cannot reconstruct a scheme the URL parser accepts", () => {
		// U+00A0 / U+200B are NOT stripped by the URL parser, so these stay relative.
		expect(sanitizeHref(" javascript:x")).toBe(" javascript:x");
		expect(sanitizeHref("java​script:x")).toBe("java​script:x");
	});
});

describe("recursion is bounded", () => {
	it("survives 5000 nested blockquotes", () => {
		const src = ">".repeat(5_000) + " boom";
		expect(() => parseMarkdown(src)).not.toThrow();
	});

	it("survives deeply nested emphasis and links", () => {
		expect(() => parseInline("*".repeat(2_000) + "x" + "*".repeat(2_000))).not.toThrow();
		expect(() => parseInline("[".repeat(500) + "x" + "](/a)".repeat(500))).not.toThrow();
	});
});
