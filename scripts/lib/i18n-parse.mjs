/**
 * Shared source parsing for the i18n tooling.
 *
 * Used by scripts/check-i18n.mjs, scripts/i18n-context.mjs,
 * scripts/i18n-manifest.mjs and src/lib/i18n/catalog-quality.test.ts. The
 * catalogs are TypeScript, so everything here reads them as text: a small
 * tokenizer that understands exactly the shapes the catalogs use (string keys,
 * string values, line and block comments) and refuses anything else loudly.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const repoRoot = resolve(__dirname, "..", "..");
export const localesPath = join(repoRoot, "src", "lib", "i18n", "locales.ts");
export const messagesDir = join(repoRoot, "src", "lib", "i18n", "messages");
export const reviewedDir = join(messagesDir, "reviewed");
export const allowlistPath = join(messagesDir, "quality-allowlist.json");
export const contextPath = join(messagesDir, "context.json");
export const appHtmlPath = join(repoRoot, "src", "app.html");

/** Plural categories a flat key can carry: `<base>.<category>`. */
export const PLURAL_CATEGORIES = ["zero", "one", "two", "few", "many", "other"];

/**
 * CLDR cardinal plural categories each locale must provide (pinned here rather
 * than read from Intl so the gate does not move with the runtime's locale data; the test
 * suite checks that Intl never selects a category outside ALLOWED).
 */
export const REQUIRED_PLURALS = {
	en: ["one", "other"],
	fr: ["one", "other"],
	es: ["one", "other"],
	de: ["one", "other"],
	it: ["one", "other"],
	pt: ["one", "other"],
	pl: ["one", "few", "many", "other"],
	cs: ["one", "few", "many", "other"],
	ja: ["other"],
	ko: ["other"],
	"zh-Hans": ["other"],
	hi: ["one", "other"],
	id: ["other"],
	tr: ["one", "other"],
	ar: ["zero", "one", "two", "few", "many", "other"],
	fa: ["one", "other"],
};

/**
 * Categories a catalog may carry beyond the required set. fr/es/it/pt have a
 * `many` category for exact millions only; the runtime falls back to `other`
 * when it is absent, so it is allowed but never required.
 */
export const OPTIONAL_PLURALS = {
	fr: ["many"],
	es: ["many"],
	it: ["many"],
	pt: ["many"],
};

export function allowedPlurals(code) {
	return [...(REQUIRED_PLURALS[code] ?? ["one", "other"]), ...(OPTIONAL_PLURALS[code] ?? [])];
}

// -----------------------------------------------------------------------------
// locales.ts
// -----------------------------------------------------------------------------

export function parseLocales() {
	const src = readFileSync(localesPath, "utf8");
	const bodyMatch = src.match(/export\s+const\s+locales[^=]*=\s*\[([\s\S]*?)^\];/m);
	if (!bodyMatch) throw new Error("Could not locate `export const locales` in locales.ts");
	const entries = [];
	const re = /\{\s*code:\s*"([^"]+)"[^}]*?dir:\s*"(ltr|rtl)"[^}]*\}/g;
	let m;
	while ((m = re.exec(bodyMatch[1])) !== null) entries.push({ code: m[1], dir: m[2] });
	if (entries.length === 0) throw new Error("Parsed zero locale entries from locales.ts");
	return entries;
}

export function listCatalogFiles() {
	return readdirSync(messagesDir)
		.filter((name) => name.endsWith(".ts") && name !== "index.ts")
		.map((name) => name.replace(/\.ts$/, ""))
		.sort();
}

// -----------------------------------------------------------------------------
// Catalog tokenizer
// -----------------------------------------------------------------------------

function readString(src, i, quote) {
	// i points at the opening quote. Returns [value, indexAfterClosingQuote].
	let j = i + 1;
	let out = "";
	while (j < src.length) {
		const c = src[j];
		if (c === "\\") {
			const n = src[j + 1];
			if (n === "n") out += "\n";
			else if (n === "t") out += "\t";
			else if (n === "u") {
				out += String.fromCharCode(parseInt(src.slice(j + 2, j + 6), 16));
				j += 4;
			} else out += n;
			j += 2;
			continue;
		}
		if (c === quote) return [out, j + 1];
		if (c === "\n") throw new Error(`Unterminated string at offset ${i}`);
		out += c;
		j++;
	}
	throw new Error(`Unterminated string at offset ${i}`);
}

/**
 * Parse a catalog source file.
 *
 * Returns `{ header, entries, src }`. `header` is the leading `//` comment line
 * (where the "machine-translated draft" marker lives). Each entry is
 * `{ key, value, context, line }`, where `context` is the text of a preceding
 * block comment `/** @context ... *\/` (the English source carries them).
 */
export function parseCatalogSource(src, file = "catalog") {
	const firstLine = src.split("\n", 1)[0] ?? "";
	const header = firstLine.startsWith("//") ? firstLine : "";
	const open = src.search(/(?:export\s+default|export\s+const\s+\w+\s*=)\s*\{/);
	if (open < 0) throw new Error(`${file}: no catalog object literal found`);
	let i = src.indexOf("{", open) + 1;
	const lineAt = (idx) => src.slice(0, idx).split("\n").length;
	const entries = [];
	let pendingContext = null;
	let pendingFrom = -1;
	for (;;) {
		// skip whitespace and comments
		while (i < src.length) {
			if (/\s/.test(src[i])) i++;
			else if (src.startsWith("//", i)) {
				const nl = src.indexOf("\n", i);
				i = nl < 0 ? src.length : nl + 1;
				pendingContext = null;
				pendingFrom = -1;
			} else if (src.startsWith("/*", i)) {
				const end = src.indexOf("*/", i + 2);
				if (end < 0) throw new Error(`${file}: unterminated block comment`);
				const body = src.slice(i + 2, end);
				const m = body.match(/@context\s+([\s\S]*)$/);
				pendingFrom = m ? i : -1;
				pendingContext = m ? m[1].replace(/\s*\n\s*\*?\s*/g, " ").trim() : null;
				i = end + 2;
			} else break;
		}
		if (src[i] === "}") break;
		if (src[i] !== '"') {
			throw new Error(`${file}: unexpected token at line ${lineAt(i)}: ${src.slice(i, i + 20)}`);
		}
		const keyIdx = i;
		const [key, afterKey] = readString(src, i, '"');
		i = afterKey;
		while (/\s/.test(src[i])) i++;
		if (src[i] !== ":") throw new Error(`${file}: expected ':' after "${key}"`);
		i++;
		while (/\s/.test(src[i])) i++;
		if (src[i] !== '"') throw new Error(`${file}: value of "${key}" is not a plain string literal`);
		const [value, afterValue] = readString(src, i, '"');
		i = afterValue;
		while (/\s/.test(src[i])) i++;
		if (src[i] === ",") i++;
		else if (src[i] !== "}") throw new Error(`${file}: expected ',' after "${key}"`);
		entries.push({
			key,
			value,
			context: pendingContext,
			line: lineAt(keyIdx),
			/** Offset of the entry's own `/** @context *\/` comment, or of the key when it has none. */
			from: pendingFrom >= 0 ? pendingFrom : keyIdx,
			/** Offset just after the entry's trailing comma. */
			to: i,
		});
		pendingContext = null;
		pendingFrom = -1;
	}
	return { header, entries, src };
}

export function parseCatalog(code) {
	const file = join(messagesDir, `${code}.ts`);
	return parseCatalogSource(readFileSync(file, "utf8"), `${code}.ts`);
}

/** `{ key: value }` view of a parsed catalog. */
export function entriesToMap(entries) {
	return Object.fromEntries(entries.map((e) => [e.key, e.value]));
}

/** True when a catalog still announces itself as a machine-translated draft. */
export function hasDraftHeader(header) {
	return /machine-translated draft/i.test(header);
}

// -----------------------------------------------------------------------------
// Plural keys
// -----------------------------------------------------------------------------

/**
 * Split a key into `{ base, category }` when its last segment is a plural
 * category, else null. Only a key whose base also exists with `.other` in the
 * English source is a plural key (so a hypothetical `foo.one` message about the
 * number one is not mistaken for one) — callers pass `pluralBases`.
 */
export function splitPluralKey(key, pluralBases) {
	const dot = key.lastIndexOf(".");
	if (dot < 0) return null;
	const category = key.slice(dot + 1);
	if (!PLURAL_CATEGORIES.includes(category)) return null;
	const base = key.slice(0, dot);
	return pluralBases.has(base) ? { base, category } : null;
}

/** The set of plural bases of an English entry list: keys `<base>.other`. */
export function pluralBasesOf(enEntries) {
	const bases = new Set();
	for (const { key } of enEntries) if (key.endsWith(".other")) bases.add(key.slice(0, -6));
	return bases;
}

// -----------------------------------------------------------------------------
// Source scans
// -----------------------------------------------------------------------------

export function* walk(dir, accept) {
	for (const name of readdirSync(dir)) {
		if (name === "node_modules" || name === ".svelte-kit" || name.startsWith(".")) continue;
		const full = join(dir, name);
		const st = statSync(full);
		if (st.isDirectory()) yield* walk(full, accept);
		else if (accept(full)) yield full;
	}
}

const SOURCE_RE = /\.(svelte|ts|js|mjs)$/;
const TEST_RE = /\.(test|spec)\.(ts|js|mjs)$/;

/** Application sources (src/, minus catalogs and tests). */
export function listAppSources() {
	return [...walk(join(repoRoot, "src"), (f) => SOURCE_RE.test(f))].filter(
		(f) => !TEST_RE.test(f) && !f.startsWith(messagesDir)
	);
}

/**
 * Scan application sources for message-key usage.
 *
 * `literals` maps a literal string (as written in code) to the first
 * `file:line` that mentions it; `prefixes` are dynamic key prefixes such as
 * `category.` from `t(`category.${x}`)` or `"gallery.desc." + x`.
 * A key is "used" if its exact text appears as a string literal somewhere in
 * the app code (so `labelKey: "jobs.feedback"` tables count), or it extends a
 * dynamic prefix.
 */
export function scanKeyUsage(files = listAppSources()) {
	const literals = new Map();
	const prefixes = new Map();
	const literalRe = /(["'`])((?:[a-zA-Z][\w-]*)(?:\.[\w-]+)+)\1/g;
	const tplPrefixRe = /`((?:[a-zA-Z][\w-]*\.)+)\$\{/g;
	const concatPrefixRe = /(["'])((?:[a-zA-Z][\w-]*\.)+)\1\s*\+/g;
	for (const file of files) {
		const src = readFileSync(file, "utf8");
		const rel = relative(repoRoot, file);
		const at = (idx) => `${rel}:${src.slice(0, idx).split("\n").length}`;
		let m;
		while ((m = literalRe.exec(src)) !== null)
			if (!literals.has(m[2])) literals.set(m[2], at(m.index));
		while ((m = tplPrefixRe.exec(src)) !== null)
			if (!prefixes.has(m[1])) prefixes.set(m[1], at(m.index));
		while ((m = concatPrefixRe.exec(src)) !== null)
			if (!prefixes.has(m[2])) prefixes.set(m[2], at(m.index));
	}
	return { literals, prefixes };
}

/** Where a key is used (first `file:line`), or null when it looks dead. */
export function findUsage(key, usage, pluralBases = new Set()) {
	const direct = usage.literals.get(key);
	if (direct) return direct;
	const split = splitPluralKey(key, pluralBases);
	if (split) {
		const base = usage.literals.get(split.base);
		if (base) return base;
	}
	for (const [prefix, where] of usage.prefixes) if (key.startsWith(prefix)) return where;
	return null;
}

// -----------------------------------------------------------------------------
// Hashing, allowlist, manifests
// -----------------------------------------------------------------------------

export const sha1 = (text) => createHash("sha1").update(text, "utf8").digest("hex");

export function readAllowlist() {
	return JSON.parse(readFileSync(allowlistPath, "utf8"));
}

/** `messages/reviewed/<code>.json` as `{ key: sha1(en) }`, or null when absent. */
export function readManifest(code) {
	const file = join(reviewedDir, `${code}.json`);
	if (!existsSync(file)) return null;
	return JSON.parse(readFileSync(file, "utf8"));
}

export function manifestPath(code) {
	return join(reviewedDir, `${code}.json`);
}

/**
 * The keys a manifest must cover for `code`: every English key, with plural
 * groups expanded to the categories that locale actually provides (their
 * hash covers every English category text of the group, so a single English
 * edit marks the whole group stale).
 */
export function pluralSource(base, enMap) {
	return PLURAL_CATEGORIES.map((c) => enMap[`${base}.${c}`])
		.filter((v) => v !== undefined)
		.join("\u0000");
}

export function expectedManifest(code, enEntries, catalogEntries) {
	const bases = pluralBasesOf(enEntries);
	const enMap = entriesToMap(enEntries);
	const out = {};
	for (const { key } of catalogEntries) {
		const split = splitPluralKey(key, bases);
		const source = split ? pluralSource(split.base, enMap) : (enMap[key] ?? "");
		out[key] = sha1(source);
	}
	return out;
}

// -----------------------------------------------------------------------------
// Static chrome scan: literal English in docs templates
// -----------------------------------------------------------------------------

/** Directories whose templates are the translated docs chrome. */
export const CHROME_ROOTS = [
	join(repoRoot, "src", "lib", "components", "docs"),
	join(repoRoot, "src", "routes", "docs"),
];

/**
 * Subtrees of CHROME_ROOTS that are content, not chrome: component example
 * demos and the recipe bodies stay English on purpose (see CONTRIBUTING.md,
 * "Translations", the "stays in English" policy).
 */
export const CHROME_EXCLUDED = [
	join(repoRoot, "src", "lib", "components", "docs", "examples"),
	join(repoRoot, "src", "lib", "components", "docs", "recipes"),
];

const TRANSLATABLE_ATTRS = ["aria-label", "title", "placeholder", "alt", "aria-roledescription"];
const SKIP_ELEMENTS = new Set(["code", "pre", "kbd", "samp", "script", "style", "svg", "title"]);

function blank(match) {
	return match.replace(/[^\n]/g, " ");
}

/** Remove everything that is not plain markup, keeping offsets and line breaks intact. */
function maskSvelte(src) {
	let out = src;
	out = out.replace(/<script\b[\s\S]*?<\/script>/g, blank);
	out = out.replace(/<style\b[\s\S]*?<\/style>/g, blank);
	out = out.replace(/<!--[\s\S]*?-->/g, blank);
	// {#if ...} {:else} {/if} {@html ...} {expr}: blank innermost braces repeatedly.
	for (let i = 0; i < 6; i++) {
		const next = out.replace(/\{[^{}]*\}/g, blank);
		if (next === out) break;
		out = next;
	}
	return out;
}

/**
 * Names that are the same in every language: the product, the platforms it
 * ships for and the tools it names. Matched whole-word, case-sensitively.
 */
export const CHROME_BRAND_WORDS = new Set([
	"FancyUI",
	"GitHub",
	"Svelte",
	"SvelteKit",
	"React",
	"Vue",
	"Tailwind",
	"TypeScript",
	"JavaScript",
	"npm",
	"pnpm",
	"npx",
	"OKLCh",
	"Node",
]);

/**
 * Is this word exempt from the English check? Brand names, acronyms and
 * identifiers (ALLCAPS, PascalCase component names such as `FluidCursor`, camelCase,
 * anything with a digit, underscore or hyphen-joined code token) are not prose.
 * A plain lowercase or Capitalised word (`Previous`, `copy`, `Browse`) is.
 */
function isExemptWord(word) {
	if (CHROME_BRAND_WORDS.has(word)) return true;
	if (/^[A-Z]{2,}$/.test(word)) return true; // CLI, API, CSS
	if (/^[A-Z][a-z0-9]+(?:[A-Z][A-Za-z0-9]*)+$/.test(word)) return true; // PascalCase
	if (/^[a-z]+[A-Z][A-Za-z0-9]*$/.test(word)) return true; // camelCase
	return false;
}

/**
 * Does this look like a human word or label in English (vs. a code token, a
 * brand or an identifier)? Any Latin word of 3 or more letters, lower or
 * upper case, that is not exempt makes the text count: single words such as
 * "Previous", "Copy" and Title Case labels are literal English too.
 */
export function looksLikeEnglish(text) {
	const t = text.replace(/&[a-z#0-9]+;/gi, " ").trim();
	if (t.length < 3) return false;
	const words = t.match(/[A-Za-z][A-Za-z0-9]*/g) ?? [];
	return words.some((w) => /^[A-Za-z]{3,}$/.test(w) && !isExemptWord(w));
}

/**
 * Scan one Svelte template for literal English text nodes and translatable
 * attributes. Returns `{ line, kind, text }[]`.
 */
export function scanSvelteSource(src) {
	const findings = [];
	const masked = maskSvelte(src);
	const lineAt = (idx) => src.slice(0, idx).split("\n").length;
	const tagRe = /<(\/)?([A-Za-z][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
	const skipStack = [];
	let last = 0;
	let m;
	const pushText = (from, to) => {
		if (skipStack.length > 0) return;
		const raw = masked.slice(from, to);
		const text = raw.replace(/\s+/g, " ").trim();
		if (looksLikeEnglish(text)) {
			const lead = raw.length - raw.trimStart().length;
			findings.push({ line: lineAt(from + lead), kind: "text", text });
		}
	};
	while ((m = tagRe.exec(masked)) !== null) {
		pushText(last, m.index);
		last = m.index + m[0].length;
		const closing = Boolean(m[1]);
		const name = m[2].toLowerCase();
		const selfClosing = m[3].trimEnd().endsWith("/");
		if (SKIP_ELEMENTS.has(name)) {
			if (closing) skipStack.pop();
			else if (!selfClosing) skipStack.push(name);
			continue;
		}
		// <link>/<meta> attributes are for machines (alternate formats, previews).
		if (closing || name === "link" || name === "meta") continue;
		for (const attr of TRANSLATABLE_ATTRS) {
			const am = new RegExp(`(?:^|\\s)${attr}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(m[3]);
			const value = am ? (am[1] ?? am[2]) : null;
			if (value && looksLikeEnglish(value)) {
				findings.push({ line: lineAt(m.index), kind: attr, text: value.trim() });
			}
		}
	}
	pushText(last, masked.length);
	return findings;
}

/** Scan every docs chrome template; returns `{ file, line, kind, text }[]` (file relative to the repo). */
export function scanStaticChrome() {
	const findings = [];
	for (const root of CHROME_ROOTS) {
		for (const file of walk(root, (f) => f.endsWith(".svelte"))) {
			if (CHROME_EXCLUDED.some((ex) => file.startsWith(ex))) continue;
			const rel = relative(repoRoot, file);
			for (const f of scanSvelteSource(readFileSync(file, "utf8")))
				findings.push({ file: rel, ...f });
		}
	}
	return findings;
}
