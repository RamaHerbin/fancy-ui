/**
 * Message formatting for the docs i18n runtime.
 *
 * Pure functions, no framework or store imports, so they are unit-testable and
 * shared by the locale store (`t`, `tn`, `tx`) and the quality tests.
 *
 * Three message shapes:
 * - Plain with placeholders: `"Name in {framework}"` -> `interpolate`.
 * - Plural: flat keys `<base>.one`, `<base>.other` (zero/two/few/many per the
 *   locale's CLDR categories) -> `resolvePlural` + `interpolate`.
 * - Rich: a closed set of inline tags (`<b>`, `<grad>`, `<solid>`, `<link>`)
 *   -> `parseRich` produces typed segments; nothing is ever treated as HTML.
 */

export type Vars = Record<string, string | number>;
export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

// -----------------------------------------------------------------------------
// Intl caches
// -----------------------------------------------------------------------------

const numberFormats = new Map<string, Intl.NumberFormat>();
const pluralRules = new Map<string, Intl.PluralRules>();

function safeLocale(locale: string): string {
	try {
		return Intl.getCanonicalLocales(locale)[0] ?? "en";
	} catch {
		return "en";
	}
}

/** Format a number for a locale (digit shapes and grouping follow the locale). */
export function formatNumber(n: number, locale = "en"): string {
	let nf = numberFormats.get(locale);
	if (!nf) {
		nf = new Intl.NumberFormat(safeLocale(locale));
		numberFormats.set(locale, nf);
	}
	return nf.format(n);
}

/** CLDR cardinal category of `n` in `locale`. */
export function pluralCategory(n: number, locale = "en"): PluralCategory {
	let pr = pluralRules.get(locale);
	if (!pr) {
		pr = new Intl.PluralRules(safeLocale(locale));
		pluralRules.set(locale, pr);
	}
	return pr.select(n) as PluralCategory;
}

// -----------------------------------------------------------------------------
// Placeholders
// -----------------------------------------------------------------------------

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Fill `{name}` placeholders. Numbers are formatted for `locale`; strings pass
 * through untouched (so versions and names are never reformatted). A
 * placeholder with no matching variable is left as written, which makes a
 * missing variable visible instead of silently blank.
 */
export function interpolate(template: string, vars?: Vars, locale = "en"): string {
	if (!vars) return template;
	return template.replace(PLACEHOLDER, (whole, name: string) => {
		if (!Object.prototype.hasOwnProperty.call(vars, name)) return whole;
		const v = vars[name];
		return typeof v === "number" ? formatNumber(v, locale) : String(v);
	});
}

// -----------------------------------------------------------------------------
// Plurals
// -----------------------------------------------------------------------------

export type Lookup = (key: string) => string | undefined;

/**
 * Pick the plural variant of `base` for `n`.
 *
 * Order: the catalog's own category for `n` in `locale`, the catalog's
 * `.other`, English's category for `n`, English's `.other`. Returns the
 * unresolved key when nothing matches, so a missing message is obvious.
 */
export function resolvePlural(
	catalog: Lookup,
	fallback: Lookup,
	base: string,
	n: number,
	locale: string
): string {
	const own = pluralCategory(n, locale);
	const en = pluralCategory(n, "en");
	return (
		catalog(`${base}.${own}`) ??
		catalog(`${base}.other`) ??
		fallback(`${base}.${en}`) ??
		fallback(`${base}.other`) ??
		base
	);
}

/** Format a plural message: choose the variant, then fill `{count}` and the rest. */
export function formatPlural(
	catalog: Lookup,
	fallback: Lookup,
	base: string,
	n: number,
	locale: string,
	vars?: Vars
): string {
	return interpolate(
		resolvePlural(catalog, fallback, base, n, locale),
		{ count: n, ...vars },
		locale
	);
}

// -----------------------------------------------------------------------------
// Rich text
// -----------------------------------------------------------------------------

export const RICH_TAGS = ["b", "grad", "solid", "link"] as const;
export type RichTag = (typeof RICH_TAGS)[number];

export type Segment = { type: "text"; text: string } | { type: RichTag; children: Segment[] };

const TAG = new RegExp(`<(/?)(${RICH_TAGS.join("|")})>`, "g");

/**
 * Parse a rich message into segments.
 *
 * Only `<b>`, `<grad>`, `<solid>` and `<link>` are tags; any other `<...>` is
 * plain text. Placeholders are filled inside text segments after parsing, so a
 * variable value can never inject a tag. Tolerant at runtime: a stray closing
 * tag is dropped and tags left open are closed at the end (the quality test
 * rejects such messages, so this only matters for a message being written).
 */
export function parseRich(template: string, vars?: Vars, locale = "en"): Segment[] {
	const root: Segment[] = [];
	const stack: { tag: RichTag; children: Segment[] }[] = [];
	const current = () => stack[stack.length - 1]?.children ?? root;
	const pushText = (raw: string) => {
		if (!raw) return;
		current().push({ type: "text", text: interpolate(raw, vars, locale) });
	};
	let last = 0;
	for (const m of template.matchAll(TAG)) {
		pushText(template.slice(last, m.index));
		last = m.index + m[0].length;
		const closing = m[1] === "/";
		const tag = m[2] as RichTag;
		if (!closing) {
			stack.push({ tag, children: [] });
			continue;
		}
		const top = stack[stack.length - 1];
		if (!top || top.tag !== tag) continue; // stray closer
		stack.pop();
		current().push({ type: tag, children: top.children });
	}
	pushText(template.slice(last));
	while (stack.length > 0) {
		const open = stack.pop()!;
		current().push({ type: open.tag, children: open.children });
	}
	return root;
}

/** Concatenated text of segments with the tags removed (for titles, aria-labels, tests). */
export function plainText(segments: Segment[]): string {
	return segments.map((s) => (s.type === "text" ? s.text : plainText(s.children))).join("");
}
