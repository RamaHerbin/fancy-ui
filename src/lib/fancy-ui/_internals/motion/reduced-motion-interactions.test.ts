/**
 * Reduced-motion snap guard for the pointer-driven interaction components that
 * used to animate unconditionally. Under `prefers-reduced-motion: reduce` the
 * state change must still happen (tilt, spotlight, glow, focus frame) but
 * instantly: every `transform` / `opacity` / `filter` transition is declared
 * behind `motion-safe:` (Tailwind) or `@media (prefers-reduced-motion:
 * no-preference)` (CSS), with the resting state as the ungated fallback.
 *
 * jsdom cannot evaluate media queries, so the CSS side is checked on the three
 * framework sources directly (this file). The behavioural side lives in render
 * tests that mock `matchMedia` to `reduce`: `focus/Focus.reduced-motion.test.*`
 * (state still advances, frame still positioned) and the GlowingEffect angle
 * snap (`glowing-effect-core.reduced-motion.test.ts` in Svelte and Vue,
 * `GlowingEffect.reduced-motion.test.tsx` in React).
 */
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

// GUARD_ROOT lets the guard run against another checkout (used to record the red).
const ROOT = process.env.GUARD_ROOT ?? resolve(__dirname, "../../../../..");

const SOURCES: Record<string, string[]> = {
	"card-3d": [
		"src/lib/fancy-ui/card-3d/CardContainer.svelte",
		"src/lib/fancy-ui/card-3d/CardItem.svelte",
		"react/src/components/card-3d/CardContainer.tsx",
		"react/src/components/card-3d/CardItem.tsx",
		"vue/src/components/card-3d/CardContainer.vue",
		"vue/src/components/card-3d/CardItem.vue",
	],
	"card-spotlight": [
		"src/lib/fancy-ui/card-spotlight/CardSpotlight.svelte",
		"react/src/components/card-spotlight/CardSpotlight.tsx",
		"vue/src/components/card-spotlight/CardSpotlight.vue",
	],
	"glowing-effect": [
		"src/lib/fancy-ui/glowing-effect/GlowingEffect.svelte",
		"react/src/components/glowing-effect/GlowingEffect.tsx",
		"vue/src/components/glowing-effect/GlowingEffect.vue",
	],
	"apple-card-carousel": [
		"src/lib/fancy-ui/apple-card-carousel/AppleCard.svelte",
		"react/src/components/apple-card-carousel/AppleCard.tsx",
		"vue/src/components/apple-card-carousel/AppleCard.vue",
	],
	"animated-testimonials": [
		"src/lib/fancy-ui/animated-testimonials/AnimatedTestimonials.svelte",
		"react/src/components/animated-testimonials/AnimatedTestimonials.tsx",
		"vue/src/components/animated-testimonials/AnimatedTestimonials.vue",
	],
	"direction-aware-hover": [
		"src/lib/fancy-ui/direction-aware-hover/DirectionAwareHover.svelte",
		"react/src/components/direction-aware-hover/DirectionAwareHover.tsx",
		"vue/src/components/direction-aware-hover/DirectionAwareHover.vue",
	],
	"interactive-grid-pattern": [
		"src/lib/fancy-ui/interactive-grid-pattern/InteractiveGridPattern.svelte",
		"react/src/components/interactive-grid-pattern/InteractiveGridPattern.tsx",
		"vue/src/components/interactive-grid-pattern/InteractiveGridPattern.vue",
	],
	"shimmer-button": [
		"src/lib/fancy-ui/shimmer-button/ShimmerButton.svelte",
		"react/src/components/shimmer-button/ShimmerButton.tsx",
		"vue/src/components/shimmer-button/ShimmerButton.vue",
	],
	"ripple-button": [
		"src/lib/fancy-ui/ripple-button/RippleButton.svelte",
		"react/src/components/ripple-button/RippleButton.tsx",
		"vue/src/components/ripple-button/RippleButton.vue",
	],
	"glare-card": [
		"src/lib/fancy-ui/glare-card/GlareCard.svelte",
		"react/src/components/glare-card/GlareCard.tsx",
		"vue/src/components/glare-card/GlareCard.vue",
	],
};

// A Tailwind transition utility not carried by the motion-safe variant.
const UNGATED_TRANSITION =
	/(?<!motion-safe:)(?<![\w-])transition(?:-(?:all|transform|opacity|filter|\[[^\]]*\]))?(?![\w-])(?=[\s"'`\\])/g;

describe("reduced motion snap: Tailwind transitions are motion-safe", () => {
	for (const [name, files] of Object.entries(SOURCES)) {
		for (const file of files) {
			it(`${name}: ${file} has no ungated transition utility`, () => {
				const src = readFileSync(resolve(ROOT, file), "utf8");
				// Drop block comments (HTML and JS/CSS) and import lines first, so only
				// code and class strings are inspected.
				const code = src
					.replace(/<!--[\s\S]*?-->/g, "")
					.replace(/\/\*[\s\S]*?\*\//g, "")
					.split("\n")
					.filter((l) => !/^\s*import /.test(l));
				const offenders = code.filter((l) => {
					// Svelte `transition:` directives and line comments are not utilities.
					// Colour-only lists (`transition-[color]`) are not motion (contract section 5).
					const stripped = l
						.replace(/transition:[a-z]+/g, "")
						.replace(
							/(?<![\w:-])transition-\[(?:(?:color|border-color|background-color),?)+\]/g,
							""
						)
						.replace(/\/\/.*$/, "");
					UNGATED_TRANSITION.lastIndex = 0;
					return UNGATED_TRANSITION.test(stripped);
				});
				expect(offenders).toEqual([]);
			});
		}
	}

	it("glare-card, card-3d, card-spotlight and glowing-effect still declare a motion-safe transition", () => {
		for (const files of Object.values(SOURCES)) {
			const joined = files.map((f) => readFileSync(resolve(ROOT, f), "utf8")).join("\n");
			expect(joined).toContain("motion-safe:transition");
		}
	});
});

// ---------------------------------------------------------------------------
// Compiled-CSS guard. Class-string greps cannot see that Tailwind emits
// `duration-*` / `delay-*` with no media query: next to a motion-safe
// `transition-*` the property falls back to `all` under reduce and the full
// duration stays in force. So the class strings are compiled with Tailwind and
// the emitted rules are inspected.
// ---------------------------------------------------------------------------

interface Block {
	prelude: string;
	decls: [string, string][];
	children: Block[];
}

/** Minimal CSS tree parser (enough for Tailwind output and component styles). */
function parseCss(css: string): Block {
	const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
	const root: Block = { prelude: "", decls: [], children: [] };
	const stack: Block[] = [root];
	let buf = "";
	let paren = 0;
	const pushDecl = (top: Block) => {
		const i = buf.indexOf(":");
		if (buf.trim() && i > 0) top.decls.push([buf.slice(0, i).trim(), buf.slice(i + 1).trim()]);
		buf = "";
	};
	for (const ch of src) {
		const top = stack[stack.length - 1];
		if (ch === "(") paren++;
		if (ch === ")") paren--;
		if (ch === "{" && paren === 0) {
			const b: Block = { prelude: buf.trim(), decls: [], children: [] };
			top.children.push(b);
			stack.push(b);
			buf = "";
		} else if (ch === ";" && paren === 0) pushDecl(top);
		else if (ch === "}" && paren === 0) {
			pushDecl(top);
			if (stack.length > 1) stack.pop();
		} else buf += ch;
	}
	return root;
}

interface Rule {
	selector: string;
	decls: [string, string][];
	media: string[];
}

function flattenRules(block: Block, media: string[] = [], out: Rule[] = []): Rule[] {
	for (const child of block.children) {
		// A keyframe body is a list of stops (`0%`, `to`), not rules: skip it whole.
		if (/^@(-\w+-)?keyframes/.test(child.prelude)) continue;
		if (child.prelude.startsWith("@media")) flattenRules(child, [...media, child.prelude], out);
		else if (child.prelude.startsWith("@")) flattenRules(child, media, out);
		else {
			if (child.decls.length) out.push({ selector: child.prelude, decls: child.decls, media });
			flattenRules(child, media, out);
		}
	}
	return out;
}

const NO_PREF = /prefers-reduced-motion:\s*no-preference/;
const COLOUR_PROP =
	/^(color|background-color|border-color|outline-color|text-decoration-color|fill|stroke|--tw-[\w-]+)$/;
const gated = (r: Rule) => r.media.some((m) => NO_PREF.test(m));

/** Is a `transition-property` value colour-only (colour is not motion)? */
function colourOnly(value: string): boolean {
	return value
		.split(",")
		.map((p) => p.trim())
		.every((p) => COLOUR_PROP.test(p));
}

const REDUCE = /prefers-reduced-motion:\s*reduce/;

/**
 * Selectors that a `reduce` rule takes out of motion: `animation: none`, a swap to
 * a calmer keyframe (`animation-name`), or the element removed (`display: none`).
 * An ungated animation on such a selector is the second accepted shape of the
 * contract, next to wrapping the declaration in `no-preference`.
 */
function reduceNeutralised(rules: Rule[]): Set<string> {
	const out = new Set<string>();
	for (const r of rules) {
		if (!r.media.some((m) => REDUCE.test(m))) continue;
		if (
			r.decls.some(
				([p, v]) =>
					(p === "animation" && /^none\b/.test(v)) ||
					p === "animation-name" ||
					(p === "display" && v === "none")
			)
		)
			for (const part of r.selector.split(",")) out.add(part.trim());
	}
	return out;
}

/** Declarations that animate something other than colour, outside no-preference. */
function ungatedMotionDecls(rules: Rule[]): string[] {
	const out: string[] = [];
	const neutralised = reduceNeutralised(rules);
	for (const r of rules) {
		if (gated(r)) continue;
		// The rules inside a `reduce` block are checked by `reduceReEnables`.
		const underReduce = r.media.some((m) => REDUCE.test(m));
		const animationOk =
			underReduce || r.selector.split(",").every((part) => neutralised.has(part.trim()));
		// A bare duration/delay with no property of its own transitions `all`.
		const hasProp = r.decls.some(([p]) => p === "transition-property" || p === "transition");
		for (const [prop, value] of r.decls) {
			if (
				(prop === "transition-duration" || prop === "transition-delay") &&
				!hasProp &&
				!/^0(m?s)?$/.test(value)
			)
				out.push(`${r.selector} { ${prop}: ${value} }`);
			// A running animation is motion; `none` / a zero duration is not.
			if (
				!animationOk &&
				(prop === "animation" || prop === "animation-name") &&
				!/^(none|initial|unset)\b/.test(value)
			)
				out.push(`${r.selector} { ${prop}: ${value} }`);
			if (!animationOk && prop === "animation-duration" && !/^0(m?s)?$/.test(value))
				out.push(`${r.selector} { ${prop}: ${value} }`);
			if (prop === "transition-property" && !colourOnly(value))
				out.push(`${r.selector} { ${prop}: ${value} }`);
			if (prop === "transition") {
				const first = value.split(",").map((part) => part.trim().split(/\s+/)[0]);
				if (first.some((p) => p && p !== "none" && !COLOUR_PROP.test(p)))
					out.push(`${r.selector} { transition: ${value} }`);
			}
		}
	}
	return out;
}

function classStrings(src: string): string[] {
	const out: string[] = [];
	for (const m of src.matchAll(/(["'`])((?:(?!\1)[^\\\n]|\\.)*)\1/g)) {
		if (/(^|\s)(?:[\w-]+:)*(?:transition|duration-|delay-)/.test(m[2])) out.push(m[2]);
	}
	return out;
}

const tailwindRequire = createRequire(import.meta.url);

async function loadStylesheet(id: string, base: string) {
	let path: string;
	if (id === "tailwindcss")
		path = tailwindRequire.resolve("tailwindcss/index.css", { paths: [ROOT] });
	else if (id.startsWith(".") || id.startsWith("/")) path = resolve(base, id);
	else path = tailwindRequire.resolve(id, { paths: [base] });
	return { path, base: dirname(path), content: await readFile(path, "utf8") };
}

async function compileRules(tokens: string[]): Promise<Rule[]> {
	const { compile } = await import("tailwindcss");
	const compiler = await compile('@import "tailwindcss";', { base: ROOT, loadStylesheet });
	return flattenRules(parseCss(compiler.build(tokens)));
}

describe("reduced motion snap: compiled Tailwind never leaves an ungated duration without a property", () => {
	let rules: Rule[] = [];
	const allStrings = new Map<string, string[]>();

	beforeAll(async () => {
		const tokens = new Set<string>();
		for (const [name, files] of Object.entries(SOURCES)) {
			const strings: string[] = [];
			for (const f of files) {
				for (const s of classStrings(readFileSync(resolve(ROOT, f), "utf8"))) {
					strings.push(s);
					for (const t of s.split(/\s+/).filter(Boolean)) tokens.add(t);
				}
			}
			allStrings.set(name, strings);
		}
		rules = await compileRules([...tokens]);
	}, 60_000);

	/** Ungated (outside no-preference) rules a single un-variant class token yields. */
	function ungatedFor(token: string) {
		const sel = "." + token.replace(/([^\w-])/g, "\\$1");
		return rules.filter((r) => r.selector === sel && !gated(r));
	}

	for (const name of Object.keys(SOURCES)) {
		it(`${name}: no ungated duration/delay and no non-colour ungated property next to a motion-safe transition`, () => {
			const offenders: string[] = [];
			for (const s of allStrings.get(name) ?? []) {
				const tokens = s.split(/\s+/).filter(Boolean);
				// Only strings that opt into a gated transition are in scope here.
				if (!tokens.some((t) => t.startsWith("motion-safe:transition"))) continue;
				const rs = tokens.flatMap((t) => (t.includes(":") ? [] : ungatedFor(t)));
				const props = rs.flatMap((r) =>
					r.decls.filter(([p]) => p === "transition-property").map(([, v]) => v)
				);
				const timed = rs.some((r) =>
					r.decls.some(([p]) => p === "transition-duration" || p === "transition-delay")
				);
				if (props.some((v) => !colourOnly(v)))
					offenders.push(`non-colour ungated property in: ${s.slice(0, 120)}`);
				// A duration with no ungated property falls back to `transition-property: all`.
				if (timed && props.length === 0)
					offenders.push(`ungated duration/delay with no property in: ${s.slice(0, 120)}`);
			}
			expect(offenders).toEqual([]);
		});
	}

	it("control: Tailwind emits an ungated duration, so the broken pattern is detectable", async () => {
		const broken = await compileRules(["duration-500", "motion-safe:transition-transform"]);
		const dur = broken.filter((r) => r.selector === ".duration-500" && !gated(r));
		expect(dur.some((r) => r.decls.some(([p]) => p === "transition-duration"))).toBe(true);
		const fixed = await compileRules([
			"motion-safe:duration-500",
			"motion-safe:transition-transform",
		]);
		expect(
			fixed.filter((r) => !gated(r) && r.decls.some(([p]) => p.startsWith("transition")))
		).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Component CSS (style blocks / .css): any non-colour transition must sit inside
// `@media (prefers-reduced-motion: no-preference)`, and nothing may re-enable
// transitions under reduce (the old document-wide `* { transition-duration }`).
// ---------------------------------------------------------------------------

const CSS_SOURCES: Record<string, string[]> = {
	"letter-pullup": [
		"src/lib/fancy-ui/letter-pullup/LetterPullup.svelte",
		"vue/src/components/letter-pullup/LetterPullup.vue",
		"react/src/components/letter-pullup/letter-pullup.css",
	],
	"text-generate-effect": [
		"src/lib/fancy-ui/text-generate-effect/TextGenerateEffect.svelte",
		"vue/src/components/text-generate-effect/TextGenerateEffect.vue",
		"react/src/components/text-generate-effect/text-generate-effect.css",
	],
	"box-reveal": [
		"src/lib/fancy-ui/box-reveal/BoxReveal.svelte",
		"vue/src/components/box-reveal/BoxReveal.vue",
		"react/src/components/box-reveal/box-reveal.css",
	],
	"hyper-text": [
		"src/lib/fancy-ui/hyper-text/HyperText.svelte",
		"vue/src/components/hyper-text/HyperText.vue",
		"react/src/components/hyper-text/hyper-text.css",
	],
	"sparkles-text": [
		"src/lib/fancy-ui/sparkles-text/SparklesText.svelte",
		"vue/src/components/sparkles-text/SparklesText.vue",
		"react/src/components/sparkles-text/sparkles-text.css",
	],
	book: [
		"src/lib/fancy-ui/book/Book.svelte",
		"vue/src/components/book/Book.vue",
		"react/src/components/book/book.css",
	],
	"flip-words": [
		"src/lib/fancy-ui/flip-words/FlipWords.svelte",
		"vue/src/components/flip-words/FlipWords.vue",
		"react/src/components/flip-words/flip-words.css",
	],
	"container-text-flip": [
		"src/lib/fancy-ui/container-text-flip/ContainerTextFlip.svelte",
		"vue/src/components/container-text-flip/ContainerTextFlip.vue",
		"react/src/components/container-text-flip/container-text-flip.css",
	],
	"terminal-text": [
		"src/lib/fancy-ui/terminal-text/TerminalText.svelte",
		"vue/src/components/terminal-text/TerminalText.vue",
		"react/src/components/terminal-text/terminal-text.css",
	],
	"bg-stars": [
		"src/lib/fancy-ui/bg-stars/StarsBackground.svelte",
		"vue/src/components/bg-stars/StarsBackground.vue",
		"react/src/components/bg-stars/bg-stars.css",
	],
	"logo-cloud": [
		"src/lib/fancy-ui/logo-cloud/AnimatedLogoCloud.svelte",
		"vue/src/components/logo-cloud/AnimatedLogoCloud.vue",
		"react/src/components/logo-cloud/logo-cloud.css",
	],
	compare: [
		"src/lib/fancy-ui/compare/StarField.svelte",
		"vue/src/components/compare/StarField.vue",
		"react/src/components/compare/star-field.css",
	],
	ripple: [
		"src/lib/fancy-ui/ripple/Ripple.svelte",
		"vue/src/components/ripple/Ripple.vue",
		"react/src/components/ripple/ripple.css",
	],
	"text-reveal-card": [
		"src/lib/fancy-ui/text-reveal-card/TextRevealStars.svelte",
		"vue/src/components/text-reveal-card/TextRevealStars.vue",
		"react/src/components/text-reveal-card/text-reveal-stars.css",
	],
	focus: [
		"src/lib/fancy-ui/focus/Focus.svelte",
		"vue/src/components/focus/Focus.vue",
		"react/src/components/focus/focus.css",
	],
	"direction-aware-hover": [
		"src/lib/fancy-ui/direction-aware-hover/DirectionAwareHover.svelte",
		"vue/src/components/direction-aware-hover/DirectionAwareHover.vue",
		"react/src/components/direction-aware-hover/direction-aware-hover.css",
	],
	"interactive-grid-pattern": [
		"src/lib/fancy-ui/interactive-grid-pattern/InteractiveGridPattern.svelte",
		"vue/src/components/interactive-grid-pattern/InteractiveGridPattern.vue",
		"react/src/components/interactive-grid-pattern/interactive-grid-pattern.css",
	],
	"shimmer-button": [
		"src/lib/fancy-ui/shimmer-button/ShimmerButton.svelte",
		"vue/src/components/shimmer-button/ShimmerButton.vue",
		"react/src/components/shimmer-button/shimmer-button.css",
	],
	"ripple-button": [
		"src/lib/fancy-ui/ripple-button/RippleButton.svelte",
		"vue/src/components/ripple-button/RippleButton.vue",
		"react/src/components/ripple-button/ripple-button.css",
	],
};

function styleText(file: string, src: string): string {
	return file.endsWith(".css")
		? src
		: [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
}

/** Selectors under `reduce` that set a transition timing (re-enabling motion). */
function reduceReEnables(rules: Rule[]): string[] {
	return rules
		.filter((r) => r.media.some((m) => /prefers-reduced-motion:\s*reduce/.test(m)))
		.filter((r) =>
			r.decls.some(
				([p, v]) =>
					(p === "transition-duration" ||
						p === "transition-delay" ||
						p === "transition" ||
						p === "animation" ||
						p === "animation-duration") &&
					!/^(none|0s)$/.test(v)
			)
		)
		.map((r) => r.selector);
}

describe("reduced motion snap: component CSS only transitions under no-preference", () => {
	for (const [name, files] of Object.entries(CSS_SOURCES)) {
		for (const file of files) {
			it(`${name}: ${file}`, () => {
				let src: string;
				try {
					src = readFileSync(resolve(ROOT, file), "utf8");
				} catch {
					return; // a port without a separate stylesheet
				}
				const rules = flattenRules(parseCss(styleText(file, src)));
				expect(ungatedMotionDecls(rules)).toEqual([]);
				expect(reduceReEnables(rules)).toEqual([]);
			});
		}
	}

	it("control: the checker flags Focus when its no-preference wrapper is removed", () => {
		const src = readFileSync(resolve(ROOT, "src/lib/fancy-ui/focus/Focus.svelte"), "utf8");
		const css = styleText("Focus.svelte", src);
		expect(ungatedMotionDecls(flattenRules(parseCss(css)))).toEqual([]);
		const unwrapped = css.replace(
			/@media \(prefers-reduced-motion: no-preference\)\s*\{/,
			"@media screen {"
		);
		expect(ungatedMotionDecls(flattenRules(parseCss(unwrapped))).length).toBeGreaterThan(0);
	});

	it("control: an ungated animation is flagged, a gated one is not, keyframes are skipped", () => {
		const keyframes = "@keyframes y { 0% { opacity: 0; } 100% { opacity: 1; } }";
		const bare = `.x { animation: y 1s infinite } ${keyframes}`;
		expect(ungatedMotionDecls(flattenRules(parseCss(bare))).length).toBe(1);
		const gatedCss = `@media (prefers-reduced-motion: no-preference) { .x { animation: y 1s infinite } } ${keyframes}`;
		expect(ungatedMotionDecls(flattenRules(parseCss(gatedCss)))).toEqual([]);
		const named = ".x { animation-name: y; animation-duration: 2s }";
		expect(ungatedMotionDecls(flattenRules(parseCss(named))).length).toBe(2);
		const reEnabled = "@media (prefers-reduced-motion: reduce) { .x { animation: y 1s infinite } }";
		expect(reduceReEnables(flattenRules(parseCss(reEnabled)))).toEqual([".x"]);
	});

	it("control: the checker flags a document-wide transition re-enabled under reduce", () => {
		const css =
			"@media (prefers-reduced-motion: reduce) { :global(*) { transition-duration: 0.1s !important; } }";
		expect(reduceReEnables(flattenRules(parseCss(css)))).toEqual([":global(*)"]);
	});
});

describe("reduced motion snap: frosted-glass settle animation", () => {
	for (const file of [
		"src/lib/fancy-ui/frosted-glass/FrostedGlass.svelte",
		"react/src/components/frosted-glass/frosted-glass.css",
		"vue/src/components/frosted-glass/FrostedGlass.vue",
	]) {
		it(`${file} only runs the settle fade under no-preference`, () => {
			const src = readFileSync(resolve(ROOT, file), "utf8");
			const lines = src.split("\n");
			const idx = lines.findIndex((l) => /^\s*animation:\s*frosted-glass-settle/.test(l));
			expect(idx).toBeGreaterThan(-1);
			const before = lines.slice(0, idx).join("\n");
			expect(before.lastIndexOf("@media (prefers-reduced-motion: no-preference)")).toBeGreaterThan(
				before.lastIndexOf(".frosted-glass-filter {") - 400
			);
			// The rule that carries the animation must sit inside the media block.
			const mediaAt = before.lastIndexOf("@media (prefers-reduced-motion: no-preference)");
			expect(mediaAt).toBeGreaterThan(-1);
			const closedBetween = before.slice(mediaAt).split("}").length - 1;
			const openedBetween = before.slice(mediaAt).split("{").length - 1;
			expect(openedBetween - closedBetween).toBeGreaterThanOrEqual(2);
		});
	}
});
