#!/usr/bin/env node
/**
 * Prop parity gate.
 *
 * `check-matrix` proves that every Svelte component folder has a React and a
 * Vue port. It says nothing about what is inside: a prop added to the Svelte
 * component and never carried over leaves all three packages green while the
 * ports quietly fall behind. This script closes that gap for the public API.
 *
 * For every component file `src/lib/fancy-ui/<slug>/<Name>.svelte` it reads the
 * declared props (members of the `*Props` interfaces plus the keys of the
 * `$props()` destructure) and requires each one to have a counterpart in
 * `react/src/components/<slug>/` and `vue/src/components/<slug>/`, after the
 * idiomatic translations the porting guides prescribe:
 *
 *   Svelte                      React                       Vue
 *   ------------------------    ------------------------    ------------------------
 *   prop                        prop                        prop
 *   Snippet prop                prop (ReactNode / render)   slot of the same name
 *   `$bindable` prop            prop, `on<Prop>Change`      `defineModel` (named or default)
 *   `on<event>` callback        `on<Event>` (any casing)    prop or emitted event
 *   `for`, `class`              `htmlFor`, `className`      same
 *   `aria-label`                `aria-label` / `ariaLabel`  same
 *
 * A prop that is deliberately absent from a port is recorded, with its reason,
 * in `scripts/prop-parity-allowlist.json`. The allowlist is a ratchet: an entry
 * for a prop that is no longer missing (or for a component that no longer
 * exists) fails the check too, so it can only shrink.
 *
 * What this does NOT catch: a redesign that changes markup, CSS or behaviour
 * without touching the prop list. Visual parity stays a review responsibility.
 *
 * Usage:
 *   node scripts/check-prop-parity.mjs [--self-test] [--list] [slug ...]
 *
 *   --self-test   run the built-in extractor/matcher cases and exit
 *   --list        print every unmatched prop, allowlisted or not, and exit 0
 *   slug ...      restrict the check to these component folders
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { basename, dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const ROOTS = {
	svelte: join(repoRoot, "src", "lib", "fancy-ui"),
	react: join(repoRoot, "react", "src", "components"),
	vue: join(repoRoot, "vue", "src", "components"),
};
const allowlistPath = join(__dirname, "prop-parity-allowlist.json");

/** Never compared: every framework spells these its own way, or has them for free. */
const IGNORED = new Set(["class", "className", "children", "ref", "style", "key"]);

// --- source scanning ---------------------------------------------------------

/**
 * The `<script>` blocks of a `.svelte` / `.vue` file, or the whole text of a
 * plain module. Markup and prose are full of apostrophes and braces that mean
 * nothing to a type scanner.
 */
export function scriptOf(src) {
	const blocks = [...src.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
	return blocks.length ? blocks.join("\n") : src;
}

/** Blank out comments, keeping string contents and line breaks intact. */
export function stripComments(src) {
	let out = "";
	let i = 0;
	let quote = null;
	while (i < src.length) {
		const ch = src[i];
		const next = src[i + 1];
		if (quote) {
			out += ch;
			if (ch === "\\") {
				out += next ?? "";
				i += 2;
				continue;
			}
			// A quote left open at a line end was an apostrophe in JSX text, not a string.
			if (ch === quote || (ch === "\n" && quote !== "`")) quote = null;
			i++;
		} else if (ch === '"' || ch === "'" || ch === "`") {
			quote = ch;
			out += ch;
			i++;
		} else if (ch === "/" && next === "/") {
			while (i < src.length && src[i] !== "\n") i++;
		} else if (ch === "/" && next === "*") {
			i += 2;
			while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
				if (src[i] === "\n") out += "\n";
				i++;
			}
			i += 2;
		} else {
			out += ch;
			i++;
		}
	}
	return out;
}

/** The text between the brace at `open` and its match, exclusive. */
function braceBody(src, open) {
	let depth = 0;
	for (let i = open; i < src.length; i++) {
		if (src[i] === "{") depth++;
		else if (src[i] === "}") {
			depth--;
			if (depth === 0) return src.slice(open + 1, i);
		}
	}
	return src.slice(open + 1);
}

/**
 * Member names declared at the top level of a type-literal / interface body:
 * `name: T`, `name?: T`, `"aria-label"?: T`, `name?(): T`. The body is cut into
 * members on `;`, `,` and line breaks that sit outside every bracket and
 * string, so nested object types, call signatures and string unions never
 * contribute a name; a continuation line of a multi-line union starts with
 * `|` and does not look like a member.
 */
export function topLevelMembers(body) {
	const names = [];
	let depth = 0;
	let quote = null;
	let member = "";
	const flush = () => {
		const m = /^\s*(?:readonly\s+)?(?:"([^"]+)"|'([^']+)'|([A-Za-z_$][\w$]*))\s*\??\s*[:(]/.exec(
			member
		);
		if (m) names.push(m[1] ?? m[2] ?? m[3]);
		member = "";
	};
	for (let i = 0; i < body.length; i++) {
		const ch = body[i];
		if (quote) {
			member += ch;
			if (ch === "\\") member += body[++i] ?? "";
			else if (ch === quote) quote = null;
			continue;
		}
		if (ch === '"' || ch === "'" || ch === "`") quote = ch;
		else if (ch === "{" || ch === "(" || ch === "[" || ch === "<") depth++;
		else if (ch === "}" || ch === ")" || ch === "]") depth = Math.max(0, depth - 1);
		else if (ch === ">" && body[i - 1] !== "=") depth = Math.max(0, depth - 1);
		if (depth === 0 && (ch === ";" || ch === "," || ch === "\n")) flush();
		else member += ch;
	}
	flush();
	return names;
}

/**
 * Members of every `interface <X><suffix>` / `type <X><suffix> = … {` in `src`,
 * including what those declarations inherit from other interfaces or type
 * literals declared in `pool` (`extends A`, `Partial<A & B>`, `A & { … }`).
 * Types that come from a package (DOM attribute sets) are not followed.
 */
export function declaredMembers(src, suffixes, pool = [src]) {
	const index = new Map();
	const header = /\b(?:interface|type)\s+([A-Za-z_$][\w$]*)\b(?:<[^>{]*>)?([^{;]*)\{/g;
	for (const text of pool) {
		let m;
		header.lastIndex = 0;
		while ((m = header.exec(text))) {
			const entry = index.get(m[1]) ?? { members: new Set(), refs: new Set() };
			for (const n of topLevelMembers(braceBody(text, header.lastIndex - 1))) entry.members.add(n);
			for (const ref of m[2].matchAll(/[A-Za-z_$][\w$]*/g)) entry.refs.add(ref[0]);
			index.set(m[1], entry);
		}
	}
	const names = new Set();
	const seen = new Set();
	const visit = (name) => {
		if (seen.has(name) || !index.has(name)) return;
		seen.add(name);
		const entry = index.get(name);
		for (const n of entry.members) names.add(n);
		for (const ref of entry.refs) visit(ref);
	};
	const own = new RegExp(`\\b(?:interface|type)\\s+(\\w*(?:${suffixes.join("|")}))\\b`, "g");
	let m;
	while ((m = own.exec(src))) visit(m[1]);
	return names;
}

/** Keys of `let { … } = $props()` and which of them default to `$bindable(…)`. */
export function sveltePropsDestructure(src) {
	const keys = new Set();
	const bindable = new Set();
	const re = /\blet\s*\{/g;
	let m;
	while ((m = re.exec(src))) {
		const open = re.lastIndex - 1;
		const body = braceBody(src, open);
		const after = src.slice(open + body.length + 2, open + body.length + 400);
		if (!/^\s*(?::[^=]+)?=\s*\$props\s*\(/.test(after)) continue;
		// Split on top-level commas only: defaults may hold objects, calls, arrays.
		let depth = 0;
		let quote = null;
		let part = "";
		const parts = [];
		for (let i = 0; i < body.length; i++) {
			const ch = body[i];
			if (quote) {
				part += ch;
				if (ch === "\\") part += body[++i] ?? "";
				else if (ch === quote) quote = null;
				continue;
			}
			if (ch === '"' || ch === "'" || ch === "`") quote = ch;
			else if (ch === "{" || ch === "(" || ch === "[") depth++;
			else if (ch === "}" || ch === ")" || ch === "]") depth--;
			if (ch === "," && depth === 0) {
				parts.push(part);
				part = "";
			} else part += ch;
		}
		parts.push(part);
		for (const raw of parts) {
			const entry = raw.trim();
			if (!entry || entry.startsWith("...")) continue;
			const key = /^(?:"([^"]+)"|'([^']+)'|([A-Za-z_$][\w$]*))/.exec(entry);
			if (!key) continue;
			const name = key[1] ?? key[2] ?? key[3];
			keys.add(name);
			if (/=\s*\$bindable\b/.test(entry)) bindable.add(name);
		}
	}
	return { keys, bindable };
}

/** Props of one Svelte component file, with the facts the matcher needs. */
export function svelteProps(src) {
	const clean = stripComments(scriptOf(src));
	const { keys, bindable } = sveltePropsDestructure(clean);
	const props = new Set([...declaredMembers(clean, ["Props"]), ...keys]);
	const snippets = new Set();
	for (const name of props) {
		const typed = new RegExp(
			`(?:^|[\\s{;])["']?${escapeRe(name)}["']?\\??\\s*:\\s*Snippet\\b`,
			"m"
		);
		if (typed.test(clean)) snippets.add(name);
	}
	return { props, bindable, snippets };
}

/** Everything a React port's sources expose as a prop name. */
export function reactSurface(sources) {
	const props = new Set();
	const clean = sources.map(stripComments);
	for (const src of clean) {
		for (const n of declaredMembers(src, ["Props"], clean)) props.add(n);
	}
	// Extending a DOM attribute set brings every native attribute and handler.
	const nativeAttrs = clean.some((src) =>
		/\b(?:\w*HTMLAttributes|ComponentProps(?:WithoutRef|WithRef)?|SVGAttributes|SVGProps)\s*</.test(
			src
		)
	);
	return { props, nativeAttrs };
}

/** Everything a Vue port's sources expose: props, slots, models, emitted events. */
export function vueSurface(sources) {
	const props = new Set();
	const slots = new Set();
	const models = new Set();
	const emits = new Set();
	let defaultModels = 0;
	const clean = sources.map((raw) => stripComments(scriptOf(raw)));
	for (const raw of sources) {
		for (const m of raw.matchAll(/<slot\b[^>]*?\bname=["']([^"']+)["']/g)) slots.add(m[1]);
		for (const m of raw.matchAll(/\$slots\.([A-Za-z_$][\w$]*)|\$slots\[["']([^"']+)["']\]/g)) {
			slots.add(m[1] ?? m[2]);
		}
	}
	for (const src of clean) {
		for (const n of declaredMembers(src, ["Props"], clean)) props.add(n);
		for (const n of declaredMembers(src, ["Slots"], clean)) slots.add(n);
		for (const n of declaredMembers(src, ["Emits"], clean)) emits.add(n);
		let m;
		const slotRead = /\$?slots\.([A-Za-z_$][\w$]*)|\$?slots\[["']([^"']+)["']\]/g;
		while ((m = slotRead.exec(src))) slots.add(m[1] ?? m[2]);
		const literal = /\bdefine(Slots|Emits)\s*<\s*\{/g;
		while ((m = literal.exec(src))) {
			const body = braceBody(src, literal.lastIndex - 1);
			const target = m[1] === "Slots" ? slots : emits;
			for (const n of topLevelMembers(body)) target.add(n);
			// Call-signature form: `(e: "flip", value: boolean): void`
			const call = /\(\s*\w+\s*:\s*((?:["'][^"']+["']\s*\|?\s*)+)/g;
			let c;
			while (m[1] === "Emits" && (c = call.exec(body))) {
				for (const q of c[1].matchAll(/["']([^"']+)["']/g)) emits.add(q[1]);
			}
		}
		const emitArray = /\bdefineEmits\s*\(\s*\[([^\]]*)\]/g;
		while ((m = emitArray.exec(src))) {
			for (const q of m[1].matchAll(/["']([^"']+)["']/g)) emits.add(q[1]);
		}
		const model = /\bdefineModel\s*(?:<[^()]*?>)?\s*\(\s*(?:["']([^"']+)["'])?/g;
		while ((m = model.exec(src))) {
			if (m[1]) models.add(m[1]);
			else defaultModels++;
		}
	}
	return { props, slots, models, emits, defaultModels };
}

// --- matching ----------------------------------------------------------------

/**
 * Attributes and events the DOM already gives the root element. The Svelte
 * source lists one in its props only when it wraps it (to chain a handler, to
 * default it); a port receives it through its DOM attribute type (React) or
 * through attribute fallthrough (Vue) without declaring anything.
 */
const NATIVE_ATTRS = new Set([
	"disabled",
	"type",
	"href",
	"target",
	"rel",
	"download",
	"title",
	"id",
	"role",
	"tabindex",
]);
const NATIVE_EVENT =
	/^on(?:click|dblclick|contextmenu|pointer\w+|mouse\w+|touch\w+|key\w+|focus\w*|blur|input|change|submit|reset|scroll\w*|wheel|drag\w*|drop|animation\w+|transition\w+|load|error)$/;
export const isNative = (name) =>
	NATIVE_ATTRS.has(name) || /^(?:aria|data)-/.test(name) || NATIVE_EVENT.test(name);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const squash = (s) => s.toLowerCase().replace(/[-:_]/g, "");
const hasLoose = (set, name) => [...set].some((n) => squash(n) === squash(name));

/** Svelte props of one component that the React surface does not carry. */
export function missingInReact(svelte, react) {
	const missing = [];
	for (const name of svelte.props) {
		if (IGNORED.has(name)) continue;
		const candidates = [name, camel(name)];
		if (name === "for") candidates.push("htmlFor");
		if (svelte.bindable.has(name)) {
			candidates.push(`on${cap(name)}Change`, `default${cap(name)}`);
		}
		if (candidates.some((c) => react.props.has(c))) continue;
		if (/^on[a-zA-Z]/.test(name) && hasLoose(react.props, name)) continue;
		if (react.nativeAttrs && isNative(name)) continue;
		missing.push(name);
	}
	return missing;
}

/** Svelte props of one component that the Vue surface does not carry. */
export function missingInVue(svelte, vue) {
	const missing = [];
	// An unnamed `defineModel()` is `v-model`: it stands in for one bindable prop.
	let defaultModels = vue.defaultModels;
	const later = [];
	for (const name of svelte.props) {
		if (IGNORED.has(name)) continue;
		if (vue.props.has(name) || vue.props.has(camel(name))) continue;
		if (svelte.snippets.has(name) && vue.slots.has(name)) continue;
		if (vue.slots.has(name)) continue;
		if (isNative(name)) continue;
		if (svelte.bindable.has(name)) {
			if (vue.models.has(name)) continue;
			later.push(name);
			continue;
		}
		if (/^on[a-zA-Z]/.test(name)) {
			if (hasLoose(vue.props, name) || hasLoose(vue.emits, name.slice(2))) continue;
		}
		missing.push(name);
	}
	for (const name of later) {
		if (defaultModels > 0) defaultModels--;
		else missing.push(name);
	}
	return missing;
}

// --- filesystem --------------------------------------------------------------

const isSource = (name, exts) =>
	exts.some((e) => name.endsWith(e)) && !/\.(test|stories|fixtures)\.|Harness|\.d\.ts$/.test(name);

function sourceFiles(dir, exts) {
	if (!existsSync(dir)) return [];
	return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
		e.isDirectory()
			? sourceFiles(join(dir, e.name), exts)
			: isSource(e.name, exts)
				? [join(dir, e.name)]
				: []
	);
}

const read = (file) => readFileSync(file, "utf8");

/**
 * Sources that define the port of one Svelte component: the same-named file
 * plus the folder's plain `.ts` modules (shared prop types). A port that folds
 * several Svelte files into one has no same-named file, so the whole folder
 * stands in for it.
 */
function portSources(root, slug, name, ext) {
	const all = sourceFiles(join(root, slug), [ext, ".ts"]);
	const own = all.filter((f) => basename(f) === `${name}${ext}`);
	if (own.length === 0) return all.map(read);
	return [...own, ...all.filter((f) => f.endsWith(".ts"))].map(read);
}

function collect(slugs) {
	const findings = [];
	for (const slug of slugs) {
		for (const file of sourceFiles(join(ROOTS.svelte, slug), [".svelte"])) {
			const name = basename(file, ".svelte");
			const svelte = svelteProps(read(file));
			if (svelte.props.size === 0) continue;
			const id = `${slug}/${name}`;
			if (existsSync(join(ROOTS.react, slug))) {
				const surface = reactSurface(portSources(ROOTS.react, slug, name, ".tsx"));
				for (const prop of missingInReact(svelte, surface)) {
					findings.push({ id, framework: "react", prop });
				}
			}
			if (existsSync(join(ROOTS.vue, slug))) {
				const surface = vueSurface(portSources(ROOTS.vue, slug, name, ".vue"));
				for (const prop of missingInVue(svelte, surface)) {
					findings.push({ id, framework: "vue", prop });
				}
			}
		}
	}
	return findings;
}

// --- self-test ---------------------------------------------------------------

function selfTest() {
	const svelteSrc = `
<script lang="ts">
	import type { Snippet } from "svelte";
	interface Props {
		/** a: b */
		label?: string;
		tone?:
			| "a"
			| "b";
		options?: { nested: string }[];
		flipped?: boolean;
		back?: Snippet;
		onflip?: (flipped: boolean) => void;
		"aria-label"?: string;
		for?: string;
		class?: string;
	}
	let { label, tone = "a", options = [{ nested: "x" }], flipped = $bindable(false), back, onflip,
		"aria-label": ariaLabel, for: htmlFor, class: className, extra = 1, ...rest }: Props = $props();
</script>`;
	const s = svelteProps(svelteSrc);
	const cases = [
		[
			"extracts interface members and destructure keys, not nested ones",
			() =>
				[
					"label",
					"tone",
					"options",
					"flipped",
					"back",
					"onflip",
					"aria-label",
					"for",
					"extra",
				].every((p) => s.props.has(p)) && !s.props.has("nested"),
		],
		["flags bindables and snippets", () => s.bindable.has("flipped") && s.snippets.has("back")],
		[
			"React: idiomatic names satisfy the Svelte props",
			() =>
				missingInReact(
					s,
					reactSurface([
						`export interface CardProps { label?: string; tone?: "a"; options?: X[]; onFlippedChange?: (v: boolean) => void; back?: ReactNode; onFlip?: () => void; ariaLabel?: string; htmlFor?: string; extra?: number }`,
					])
				).length === 0,
		],
		[
			"React: a dropped prop is reported",
			() =>
				missingInReact(
					s,
					reactSurface([`export interface CardProps {\n\tlabel?: string;\n}`])
				).includes("tone"),
		],
		[
			"Vue: slots, models and emits satisfy snippets, bindables and callbacks",
			() =>
				missingInVue(
					s,
					vueSurface([
						`<script setup lang="ts">
export interface CardProps { label?: string; tone?: "a"; options?: X[]; "aria-label"?: string; for?: string; extra?: number }
const flipped = defineModel<boolean>("flipped", { default: false });
const emit = defineEmits<{ flip: [flipped: boolean] }>();
</script>
<template><div><slot name="back" /></div></template>`,
					])
				).length === 0,
		],
		[
			"Vue: one default v-model covers exactly one bindable",
			() => {
				const two = svelteProps(
					`<script lang="ts">let { checked = $bindable(false), indeterminate = $bindable(false) } = $props();</script>`
				);
				const surface = vueSurface([`const model = defineModel<boolean>({ default: false });`]);
				return missingInVue(two, surface).length === 1;
			},
		],
		[
			"props inherited from a local interface count; string defaults are not split",
			() => {
				const react = reactSurface([
					`interface CoreOptions {\n\tcurl?: number;\n}\nexport interface FxProps extends Partial<CoreOptions> {\n\tfont?: string;\n}`,
				]);
				const sv = svelteProps(
					`<script lang="ts">let { curl = 3, font = "Helvetica, Arial, sans-serif" } = $props();</script>`
				);
				return sv.props.size === 2 && missingInReact(sv, react).length === 0;
			},
		],
		[
			"native attributes ride on the DOM attribute type, custom callbacks do not",
			() => {
				const sv = svelteProps(
					`<script lang="ts">let { onclick, disabled, onflip } = $props();</script>`
				);
				const react = reactSurface([
					`export interface BProps extends ButtonHTMLAttributes<HTMLButtonElement> {\n\tx?: string;\n}`,
				]);
				const missing = missingInReact(sv, react);
				return missing.length === 1 && missing[0] === "onflip";
			},
		],
		[
			"markup apostrophes outside the script do not derail the scan",
			() =>
				vueSurface([
					`<!-- the model's id -->\n<script setup lang="ts">\nexport interface PProps {\n\t/** the picker's name */\n\tlabel?: string;\n}\n</script>\n<template><p>don't</p></template>`,
				]).props.has("label"),
		],
		[
			"comments do not leak members",
			() =>
				!declaredMembers(
					stripComments(`interface AProps {\n\t// ghost: string;\n\treal: string;\n}`),
					["Props"]
				).has("ghost"),
		],
	];
	let failed = 0;
	for (const [label, run] of cases) {
		let ok = false;
		try {
			ok = run();
		} catch {
			ok = false;
		}
		if (!ok) {
			failed++;
			console.error(`  FAIL  ${label}`);
		}
	}
	if (failed) {
		console.error(`Prop parity self-test FAILED (${failed}/${cases.length}).`);
		process.exit(1);
	}
	console.log(`Prop parity self-test OK (${cases.length} cases).`);
}

// --- main --------------------------------------------------------------------

function main() {
	const args = process.argv.slice(2);
	if (args.includes("--self-test")) return selfTest();
	const list = args.includes("--list");
	const only = args.filter((a) => !a.startsWith("--"));

	const slugs = readdirSync(ROOTS.svelte, { withFileTypes: true })
		.filter((e) => e.isDirectory() && !e.name.startsWith("_"))
		.map((e) => e.name)
		.filter((s) => existsSync(join(ROOTS.react, s)) || existsSync(join(ROOTS.vue, s)))
		.filter((s) => only.length === 0 || only.includes(s))
		.sort();

	const findings = collect(slugs);
	const allowlist = existsSync(allowlistPath) ? JSON.parse(read(allowlistPath)) : {};
	const allowed = (f) => typeof allowlist[f.id]?.[f.framework]?.[f.prop] === "string";

	if (list) {
		for (const f of findings) {
			console.log(`${f.id}  ${f.framework}  ${f.prop}${allowed(f) ? "  (allowlisted)" : ""}`);
		}
		console.log(`${findings.length} unmatched prop(s) across ${slugs.length} component folders.`);
		return;
	}

	const unexplained = findings.filter((f) => !allowed(f));
	const stale = [];
	if (only.length === 0) {
		const live = new Set(findings.map((f) => `${f.id}|${f.framework}|${f.prop}`));
		for (const [id, byFramework] of Object.entries(allowlist)) {
			for (const [framework, props] of Object.entries(byFramework)) {
				for (const prop of Object.keys(props)) {
					if (!live.has(`${id}|${framework}|${prop}`)) stale.push({ id, framework, prop });
				}
			}
		}
	}

	if (unexplained.length === 0 && stale.length === 0) {
		console.log(
			`Prop parity OK (${slugs.length} component folders, ${findings.length} allowlisted divergence(s)).`
		);
		return;
	}

	if (unexplained.length) {
		console.error("Prop parity check FAILED: Svelte props with no counterpart in a port.\n");
		for (const f of unexplained) {
			console.error(`  ${f.id}: ${f.framework} port has no "${f.prop}"`);
		}
		console.error(
			"\nPort the prop, or record why it is absent in scripts/prop-parity-allowlist.json."
		);
	}
	if (stale.length) {
		console.error("\nStale allowlist entries (the prop is no longer missing — remove them):\n");
		for (const f of stale) console.error(`  ${f.id}: ${f.framework} "${f.prop}"`);
	}
	process.exit(1);
}

main();
