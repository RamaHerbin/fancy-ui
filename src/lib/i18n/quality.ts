/**
 * Catalog quality checks.
 *
 * Pure functions over `{ key: message }` maps, so each check can be fed a
 * hand-written fixture in `catalog-quality.test.ts` (every check is proven able
 * to fail) and then run against the real catalogs. Reading files, scanning the
 * source tree and deciding what blocks a merge live in the test; this module
 * only judges strings.
 */

import {
	BUDGET_PREFIXES,
	SHORT_LABEL_MAX,
	budgetFor,
	lengthBudget,
	lengthOf,
} from "../../../scripts/lib/i18n-budget.mjs";

export type CheckId =
	| "structure"
	| "untranslated"
	| "placeholders"
	| "markup"
	| "punctuation"
	| "hygiene"
	| "length"
	| "deadKeys"
	| "manifest"
	| "staticChrome";

export interface Finding {
	check: CheckId;
	code: string;
	key: string;
	message: string;
}

export type Dict = Record<string, string>;

/** `{ "*": { key: reason }, "<locale>": { key: reason } }` */
export type PerLocale<T = string> = Record<string, Record<string, T>>;

export interface Allowlist {
	manifestMode: "warn" | "fail";
	untranslated: PerLocale;
	punctuation: PerLocale;
	hygiene: PerLocale;
	/** Absolute maximum length (code points) for a key, overriding the computed budget. */
	length: PerLocale<number>;
	deadKeys: { pendingConsumers: string[] };
	staticChrome: { file: string; text: string; reason: string }[];
}

export const PLURAL_CATEGORIES = ["zero", "one", "two", "few", "many", "other"] as const;
export type PluralCat = (typeof PLURAL_CATEGORIES)[number];

/** Locales where the `one` category is exactly n = 1, so the number may be left out of it. */
const ONE_IS_EXACTLY_ONE = new Set(["en", "de", "es", "it", "tr", "pl", "cs", "ar"]);

const allowed = (list: PerLocale | PerLocale<number>, code: string, key: string) =>
	key in (list["*"] ?? {}) || key in (list[code] ?? {});

// -----------------------------------------------------------------------------
// Plural helpers
// -----------------------------------------------------------------------------

/** Bases of the plural messages in the English source: every `<base>.other`. */
export function pluralBases(en: Dict): Set<string> {
	const bases = new Set<string>();
	for (const key of Object.keys(en)) if (key.endsWith(".other")) bases.add(key.slice(0, -6));
	return bases;
}

export function splitPlural(
	key: string,
	bases: Set<string>
): { base: string; category: PluralCat } | null {
	const dot = key.lastIndexOf(".");
	if (dot < 0) return null;
	const category = key.slice(dot + 1) as PluralCat;
	const base = key.slice(0, dot);
	return (PLURAL_CATEGORIES as readonly string[]).includes(category) && bases.has(base)
		? { base, category }
		: null;
}

/**
 * The English sentence a catalog key is a translation of. A plural variant is
 * compared with the English variant of the same category when there is one,
 * else with English `.other`.
 */
export function sourceOf(key: string, en: Dict, bases: Set<string>): string | undefined {
	const split = splitPlural(key, bases);
	if (!split) return en[key];
	return en[`${split.base}.${split.category}`] ?? en[`${split.base}.other`];
}

// -----------------------------------------------------------------------------
// 0. Structure: plural categories per locale (the key set itself is check-i18n's job)
// -----------------------------------------------------------------------------

export function checkPluralStructure(
	code: string,
	en: Dict,
	cat: Dict,
	required: readonly string[],
	optional: readonly string[] = []
): Finding[] {
	const out: Finding[] = [];
	for (const base of pluralBases(en)) {
		const have = PLURAL_CATEGORIES.filter((c) => `${base}.${c}` in cat);
		for (const c of required) {
			if (!have.includes(c as PluralCat)) {
				out.push({
					check: "structure",
					code,
					key: `${base}.${c}`,
					message: `missing plural category "${c}" (CLDR requires ${required.join("/")} for ${code})`,
				});
			}
		}
		for (const c of have) {
			if (!required.includes(c) && !optional.includes(c)) {
				out.push({
					check: "structure",
					code,
					key: `${base}.${c}`,
					message: `plural category "${c}" does not exist in ${code} (allowed: ${[...required, ...optional].join("/")})`,
				});
			}
		}
	}
	return out;
}

// -----------------------------------------------------------------------------
// 1. Untranslated
// -----------------------------------------------------------------------------

export function checkUntranslated(code: string, en: Dict, cat: Dict, allow: Allowlist): Finding[] {
	if (code === "en") return [];
	const bases = pluralBases(en);
	const out: Finding[] = [];
	for (const [key, value] of Object.entries(cat)) {
		const source = sourceOf(key, en, bases);
		if (source === undefined || value.trim() !== source.trim()) continue;
		if (!/[A-Za-z]{2,}/.test(value)) continue; // numbers, symbols
		if (allowed(allow.untranslated, code, key)) continue;
		out.push({
			check: "untranslated",
			code,
			key,
			message: `identical to English: "${value}" (translate it, or allowlist it with a reason if it is a term that stays)`,
		});
	}
	return out;
}

// -----------------------------------------------------------------------------
// 2. Placeholder parity
// -----------------------------------------------------------------------------

const placeholdersOf = (s: string): string[] => [...(s.match(/\{\w+\}/g) ?? [])].sort();

export function checkPlaceholders(code: string, en: Dict, cat: Dict): Finding[] {
	const bases = pluralBases(en);
	const out: Finding[] = [];
	for (const [key, value] of Object.entries(cat)) {
		const source = sourceOf(key, en, bases);
		if (source === undefined) continue;
		let want = placeholdersOf(source);
		const split = splitPlural(key, bases);
		// A variant that means exactly one (or two, or none) may say it in words.
		const mayDropCount =
			split &&
			((split.category === "one" && ONE_IS_EXACTLY_ONE.has(code)) ||
				split.category === "two" ||
				split.category === "zero");
		const have = placeholdersOf(value);
		if (mayDropCount) {
			want = want.filter((p) => p !== "{count}" || have.includes(p));
		}
		if (want.join(",") !== have.join(",")) {
			out.push({
				check: "placeholders",
				code,
				key,
				message: `placeholders ${have.join(" ") || "(none)"} do not match English ${want.join(" ") || "(none)"}`,
			});
		}
	}
	return out;
}

// -----------------------------------------------------------------------------
// 3. Markup parity and nesting
// -----------------------------------------------------------------------------

const ANY_TAG = /<\/?[A-Za-z][^<>]*>/g;
const KNOWN_TAG = /^<(\/?)(b|grad|solid|link)>$/;

/** Returns a description of the first nesting error, or null when the known tags nest properly. */
export function tagNestingError(message: string): string | null {
	const stack: string[] = [];
	for (const tag of message.match(ANY_TAG) ?? []) {
		const m = KNOWN_TAG.exec(tag);
		if (!m) continue;
		if (!m[1]) stack.push(m[2]);
		else if (stack.pop() !== m[2]) return `unexpected ${tag}`;
	}
	return stack.length ? `<${stack[stack.length - 1]}> is never closed` : null;
}

export function checkMarkup(code: string, en: Dict, cat: Dict): Finding[] {
	const bases = pluralBases(en);
	const out: Finding[] = [];
	for (const [key, value] of Object.entries(cat)) {
		const source = sourceOf(key, en, bases);
		if (source === undefined) continue;
		const want = [...(source.match(ANY_TAG) ?? [])].sort().join(" ");
		const have = [...(value.match(ANY_TAG) ?? [])].sort().join(" ");
		if (want !== have) {
			out.push({
				check: "markup",
				code,
				key,
				message: `tags [${have}] do not match English [${want}]`,
			});
			continue;
		}
		const nesting = tagNestingError(value);
		if (nesting) out.push({ check: "markup", code, key, message: nesting });
	}
	return out;
}

// -----------------------------------------------------------------------------
// 4. Ending punctuation class
// -----------------------------------------------------------------------------

export type EndClass = "none" | "stop" | "colon" | "question" | "exclaim" | "semi" | "ellipsis";

export function endClass(message: string): EndClass {
	let s = message.replace(/<\/?[A-Za-z][^<>]*>/g, "");
	s = s.replace(/[\s  ]+$/u, "");
	s = s.replace(/[)\]"'”’»」』）]+$/u, "");
	if (/(\.\.\.|…|⋯)$/u.test(s)) return "ellipsis";
	const last = s.slice(-1);
	if (/[.。．｡।۔]/u.test(last)) return "stop";
	if (/[:：]/u.test(last)) return "colon";
	if (/[?？؟]/u.test(last)) return "question";
	if (/[!！]/u.test(last)) return "exclaim";
	if (/[;；؛]/u.test(last)) return "semi";
	return "none";
}

export function checkPunctuation(code: string, en: Dict, cat: Dict, allow: Allowlist): Finding[] {
	if (code === "en") return [];
	const bases = pluralBases(en);
	const out: Finding[] = [];
	for (const [key, value] of Object.entries(cat)) {
		const source = sourceOf(key, en, bases);
		if (source === undefined || allowed(allow.punctuation, code, key)) continue;
		const want = endClass(source);
		const have = endClass(value);
		if (want !== have) {
			out.push({
				check: "punctuation",
				code,
				key,
				message: `ends with "${have}" punctuation, English ends with "${want}"`,
			});
		}
	}
	return out;
}

// -----------------------------------------------------------------------------
// 5. Script hygiene
// -----------------------------------------------------------------------------

const CJK = "[\\u3040-\\u30ff\\u3400-\\u9fff\\uff66-\\uff9f]";
const ARABIC = "[\\u0600-\\u06ff\\u0750-\\u077f]";
const NBSP = /[  ]/;

/** Messages that mean `message` is clean: returns the list of problems found. */
export function hygieneProblems(code: string, message: string): string[] {
	const problems: string[] = [];
	const text = message.replace(/\{\w+\}/g, "x").replace(/<\/?[A-Za-z][^<>]*>/g, "");

	if (/ {2,}/.test(message)) problems.push("double space");
	if (message !== message.trim()) problems.push("leading or trailing whitespace");
	if (/(?<!\.)\.\.(?!\.)/.test(text)) problems.push('stray ".." (use one stop or an ellipsis)');
	if (/[,;:]{2}|[،؛]{2}|[!?]{2}/.test(text)) problems.push("doubled punctuation");

	if (code === "fr") {
		const chars = [...text];
		chars.forEach((ch, i) => {
			const prev = chars[i - 1];
			const next = chars[i + 1];
			if (/[;!?]/.test(ch) && prev !== undefined && (next === undefined || /[\s)]/.test(next))) {
				if (!NBSP.test(prev)) problems.push(`"${ch}" needs a no-break space (U+202F) before it`);
			}
			if (ch === ":" && prev !== undefined && (next === undefined || next === " ")) {
				if (!NBSP.test(prev)) problems.push('":" needs a no-break space before it');
			}
			if (ch === "»" && prev !== undefined && !NBSP.test(prev)) {
				problems.push('"»" needs a no-break space before it');
			}
			if (ch === "«" && next !== undefined && !NBSP.test(next)) {
				problems.push('"«" needs a no-break space after it');
			}
		});
	}

	if (code === "pl" || code === "cs") {
		const letters = code === "pl" ? "aiouwz" : "aiksuvz";
		const re = new RegExp(`(^|[\\s(«„"])([${letters}${letters.toUpperCase()}]) (?=\\S)`, "g");
		for (const m of text.matchAll(re)) {
			problems.push(
				`single-letter word "${m[2]}" is followed by an ordinary space (use U+00A0 or U+202F)`
			);
		}
	}

	if (code === "ja" || code === "zh-Hans") {
		if (new RegExp(`${CJK}[,;:!?()]|[,;:!?()]${CJK}`).test(text)) {
			problems.push("half-width punctuation next to CJK text (use the full-width form)");
		}
		if (new RegExp(`${CJK}\\.(?=\\s|$)`).test(text)) {
			problems.push('half-width "." after CJK text (use "。")');
		}
		if (/[A-Za-z0-9][，。；：！？][A-Za-z0-9]/.test(text)) {
			problems.push("full-width punctuation between Latin words (use the half-width form)");
		}
	}

	if (code === "ar" || code === "fa") {
		if (new RegExp(`${ARABIC}\\s*,`).test(text))
			problems.push('ASCII "," after Arabic text (use "،")');
		if (new RegExp(`${ARABIC}\\s*;`).test(text))
			problems.push('ASCII ";" after Arabic text (use "؛")');
		if (new RegExp(`${ARABIC}\\s*\\?`).test(text))
			problems.push('ASCII "?" after Arabic text (use "؟")');
	}

	return [...new Set(problems)];
}

export function checkHygiene(code: string, cat: Dict, allow: Allowlist): Finding[] {
	if (code === "en") return [];
	const out: Finding[] = [];
	for (const [key, value] of Object.entries(cat)) {
		if (allowed(allow.hygiene, code, key)) continue;
		for (const message of hygieneProblems(code, value)) {
			out.push({ check: "hygiene", code, key, message });
		}
	}
	return out;
}

// -----------------------------------------------------------------------------
// 6. Length budget for short labels
// -----------------------------------------------------------------------------

export { BUDGET_PREFIXES, SHORT_LABEL_MAX, lengthBudget, lengthOf, budgetFor };

export function checkLength(code: string, en: Dict, cat: Dict, allow: Allowlist): Finding[] {
	if (code === "en") return [];
	const bases = pluralBases(en);
	const out: Finding[] = [];
	for (const [key, value] of Object.entries(cat)) {
		if (splitPlural(key, bases)) continue;
		const source = en[key];
		if (source === undefined) continue;
		const computed = budgetFor(key, source);
		if (computed === null) continue;
		const max = allow.length[code]?.[key] ?? allow.length["*"]?.[key] ?? computed;
		const len = lengthOf(value);
		if (len > max) {
			out.push({
				check: "length",
				code,
				key,
				message: `${len} characters, budget ${max} (English ${lengthOf(source)}): "${value}"`,
			});
		}
	}
	return out;
}

// -----------------------------------------------------------------------------
// 7. Dead keys
// -----------------------------------------------------------------------------

export function checkDeadKeys(
	enKeys: string[],
	isUsed: (key: string) => boolean,
	allow: Allowlist
): Finding[] {
	const pending = new Set(allow.deadKeys.pendingConsumers);
	return enKeys
		.filter((key) => !isUsed(key) && !pending.has(key))
		.map((key) => ({
			check: "deadKeys" as const,
			code: "en",
			key,
			message:
				"no literal t()/tn()/tx() use and no dynamic prefix reaches it: delete it from every catalog",
		}));
}

// -----------------------------------------------------------------------------
// 8. Review manifest
// -----------------------------------------------------------------------------

export interface ManifestResult {
	/** Findings that block when the manifest exists (or the mode is "fail"). */
	findings: Finding[];
	/** True when `messages/reviewed/<code>.json` does not exist yet. */
	absent: boolean;
}

/**
 * `expected` is `{ key: sha1(English source) }` for every key the locale has;
 * `manifest` is the reviewer's `messages/reviewed/<code>.json` or null.
 */
export function checkManifest(
	code: string,
	manifest: Record<string, string> | null,
	expected: Record<string, string>,
	draftHeader: boolean
): ManifestResult {
	const out: Finding[] = [];
	const add = (key: string, message: string) => out.push({ check: "manifest", code, key, message });
	if (manifest === null) {
		if (draftHeader) add("(header)", 'catalog still carries the "machine-translated draft" header');
		add(
			"(manifest)",
			`messages/reviewed/${code}.json does not exist yet: no key is marked as reviewed`
		);
		return { findings: out, absent: true };
	}
	if (draftHeader) add("(header)", 'catalog still carries the "machine-translated draft" header');
	for (const [key, hash] of Object.entries(expected)) {
		if (!(key in manifest)) add(key, "not reviewed (missing from the manifest)");
		else if (manifest[key] !== hash) add(key, "English changed since the review (stale hash)");
	}
	for (const key of Object.keys(manifest)) {
		if (!(key in expected)) add(key, "manifest lists a key the catalog no longer has");
	}
	return { findings: out, absent: false };
}

// -----------------------------------------------------------------------------
// 9. Static chrome
// -----------------------------------------------------------------------------

export interface ChromeHit {
	file: string;
	line: number;
	kind: string;
	text: string;
}

export function checkStaticChrome(hits: ChromeHit[], allow: Allowlist): Finding[] {
	return hits
		.filter((h) => !allow.staticChrome.some((a) => a.file === h.file && a.text === h.text))
		.map((h) => ({
			check: "staticChrome" as const,
			code: "en",
			key: `${h.file}:${h.line}`,
			message: `literal English ${h.kind} "${h.text}": move it to a message key, or allowlist it with a reason`,
		}));
}
