/**
 * Hover gate guard (CONTRACTS §4): a `:hover` rule that moves something
 * (transform, translate, scale, opacity, filter, clip-path, ...) must
 *
 *  1. sit inside `@media (hover: hover)`, so a touch UA that fakes a sticky
 *     hover after a tap never leaves the effect parked, and
 *  2. have a keyboard twin, meaning a `:focus-visible` / `:focus-within` rule
 *     in the same component that sets the same property, so the state is not
 *     reachable by pointer only.
 *
 * The check reads the three framework sources directly (jsdom cannot evaluate
 * media queries): `<style>` blocks of the Svelte and Vue single-file
 * components, the React `.css` files, and the Tailwind `hover:` / `group-hover:`
 * utilities in markup (each needs a `focus-visible` / `focus-within` twin).
 *
 * `EXEMPT` lists the rules that are decorative pointer effects with no meaning
 * to mirror on focus; each entry carries its reason.
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// GUARD_ROOT lets the guard run against another checkout (used to record the red).
const ROOT = process.env.GUARD_ROOT ?? resolve(__dirname, "../../../../..");

/** Wave B slugs covered by the gate. Add a slug here when its hover rules are gated. */
const SLUGS = [
	"shimmer-button",
	"gradient-button",
	"interactive-hover-button",
	"rainbow-button",
	"bento-grid",
	"dim-siblings",
	"line-hover-link",
	"thread-list",
	"marquee",
	"book",
];

/** Selector fragment -> reason it has no keyboard twin. */
const EXEMPT: Record<string, string> = {
	".shimmer-button:hover .shimmer-button__sheen":
		"the sweep hands over to the pointer spotlight; on focus the sweep simply keeps running",
};

const MOTION = new Set([
	"transform",
	"translate",
	"scale",
	"rotate",
	"filter",
	"backdrop-filter",
	"opacity",
	"clip-path",
	"mask-image",
	"stroke-dashoffset",
	"animation",
	"animation-name",
	"animation-play-state",
]);
const TRANSFORMS = ["transform", "translate", "scale", "rotate"];

interface Rule {
	selector: string;
	props: string[];
	stack: string[];
}

function parseCss(css: string, stack: string[], out: Rule[]): void {
	let i = 0;
	while (i < css.length) {
		const open = css.indexOf("{", i);
		if (open < 0) break;
		const prelude = css
			.slice(i, open)
			.replace(/\/\*[\s\S]*?\*\//g, "")
			.trim();
		let depth = 1;
		let j = open + 1;
		while (j < css.length && depth) {
			if (css[j] === "{") depth++;
			else if (css[j] === "}") depth--;
			j++;
		}
		const body = css.slice(open + 1, j - 1);
		if (prelude.startsWith("@")) {
			if (/^@(media|supports|container|layer)/.test(prelude))
				parseCss(body, [...stack, prelude], out);
		} else {
			const props = [
				...body.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(?:^|;)\s*([a-z-]+)\s*:/g),
			].map((m) => m[1] as string);
			out.push({ selector: prelude.replace(/\s+/g, " "), props, stack });
		}
		i = j;
	}
}

function styleBlocks(file: string, src: string): string[] {
	if (file.endsWith(".css")) return [src];
	return [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1] as string);
}

function sourcesFor(slug: string): { file: string; src: string }[] {
	const dirs = [
		`src/lib/fancy-ui/${slug}`,
		`react/src/components/${slug}`,
		`vue/src/components/${slug}`,
	];
	const files: { file: string; src: string }[] = [];
	for (const dir of dirs) {
		for (const name of readdirSync(resolve(ROOT, dir))) {
			if (!/\.(svelte|vue|css|tsx)$/.test(name) || /test|Harness/i.test(name)) continue;
			files.push({
				file: `${dir}/${name}`,
				src: readFileSync(resolve(ROOT, dir, name), "utf8"),
			});
		}
	}
	return files;
}

const isHoverRule = (r: Rule) =>
	r.selector.split(",").some((s) => /:hover/.test(s) && !/:not\([^)]*:hover/.test(s));

describe("hover-gated motion with keyboard twins", () => {
	it("finds gated hover rules to check (the parser is not matching nothing)", () => {
		let gated = 0;
		for (const slug of SLUGS)
			for (const f of sourcesFor(slug))
				for (const block of styleBlocks(f.file, f.src)) {
					const out: Rule[] = [];
					parseCss(block, [], out);
					gated += out.filter(
						(r) => isHoverRule(r) && r.stack.some((s) => /hover\s*:\s*hover/.test(s))
					).length;
				}
		expect(gated).toBeGreaterThan(60);
	});

	for (const slug of SLUGS) {
		const files = sourcesFor(slug);

		for (const framework of ["src/lib/fancy-ui", "react/src", "vue/src"]) {
			const mine = files.filter((f) => f.file.startsWith(framework));
			const rules: (Rule & { file: string })[] = [];
			for (const f of mine)
				for (const block of styleBlocks(f.file, f.src)) {
					const out: Rule[] = [];
					parseCss(block, [], out);
					for (const r of out) rules.push({ ...r, file: f.file });
				}
			const focusProps = new Set(
				rules.filter((r) => /:focus-visible|:focus-within/.test(r.selector)).flatMap((r) => r.props)
			);
			const hoverMotion = rules.filter((r) => isHoverRule(r) && r.props.some((p) => MOTION.has(p)));

			it(`${slug} (${framework}): every motion :hover rule sits in (hover: hover)`, () => {
				const ungated = hoverMotion
					.filter((r) => !r.stack.some((s) => /hover\s*:\s*hover/.test(s)))
					.map((r) => `${r.file}: ${r.selector}`);
				expect(ungated).toEqual([]);
			});

			it(`${slug} (${framework}): every motion :hover rule has a focus twin`, () => {
				const orphans = hoverMotion
					.filter((r) => !/:focus/.test(r.selector))
					.filter((r) => !Object.keys(EXEMPT).some((k) => r.selector.includes(k)))
					.filter((r) =>
						r.props
							.filter((p) => MOTION.has(p))
							.some(
								(p) =>
									!(
										focusProps.has(p) ||
										(TRANSFORMS.includes(p) && TRANSFORMS.some((q) => focusProps.has(q)))
									)
							)
					)
					.map((r) => `${r.file}: ${r.selector}`);
				expect(orphans).toEqual([]);
			});

			it(`${slug} (${framework}): Tailwind hover motion utilities have a focus twin`, () => {
				const missing: string[] = [];
				for (const f of mine) {
					const markup = f.src.replace(/<style[\s\S]*?<\/style>/g, "");
					for (const m of markup.matchAll(/(?<![\w-])((?:group-|peer-)?hover):([^\s"'`}]+)/g)) {
						const util = m[2] as string;
						if (
							!/^(-?scale|-?translate|opacity|-?rotate|blur|\[(transform|filter|opacity|clip))/.test(
								util
							)
						)
							continue;
						const twin = new RegExp(
							`(focus-visible|focus-within|group-focus-visible|group-focus-within|peer-focus-visible):${util.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
						);
						if (!twin.test(markup)) missing.push(`${f.file}: ${m[0]}`);
					}
				}
				expect(missing).toEqual([]);
			});
		}
	}
});
