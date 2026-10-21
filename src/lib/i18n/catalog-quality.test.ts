/**
 * Catalog quality gate.
 *
 * Two layers:
 *  1. Fixtures: every check in `quality.ts` is fed a string that must trip it
 *     (and one that must not), so a check can never rot into a no-op.
 *  2. The real catalogs, one `describe("catalog <code>")` per locale, so
 *     `pnpm vitest run src/lib/i18n/catalog-quality.test.ts -t "catalog fr"`
 *     shows a single locale.
 *
 * What blocks, and when:
 *  - Always: key set, plural categories, placeholders and markup parity, dead
 *    keys, literal English in the docs chrome, the format runtime.
 *  - Style checks (untranslated, ending punctuation, script hygiene, length
 *    budget): only for a *reviewed* locale, i.e. one that has a
 *    `messages/reviewed/<code>.json` manifest, or any locale named in
 *    `I18N_STRICT` (comma list, or `all`). Unreviewed locales get a one-line
 *    warning, and `I18N_STRICT=<code>` turns the list into failures so the
 *    reviewer can work through it.
 *  - Review manifest: warns while `messages/reviewed/<code>.json` is absent;
 *    once it exists it fails when incomplete or stale, and while the catalog
 *    still carries the "machine-translated draft" header. Set
 *    `manifestMode` to "fail" in quality-allowlist.json to make an absent
 *    manifest fail too.
 */

import { readFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import * as P from "../../../scripts/lib/i18n-parse.mjs";
import * as ContextGen from "../../../scripts/i18n-context.mjs";
import * as Q from "./quality.js";
import * as F from "./format.js";
import { catalogs } from "./messages/index.js";
import { t, tn, tx, setLocale } from "$lib/stores";
import { locales } from "./locales.js";

const allow = P.readAllowlist() as Q.Allowlist;
const enEntries = P.parseCatalog("en").entries as {
	key: string;
	value: string;
	context: string | null;
}[];
const en = P.entriesToMap(enEntries) as Q.Dict;
const bases = Q.pluralBases(en);
const codes = (P.listCatalogFiles() as string[]).filter((c) => c !== "en");

const strictEnv = (process.env.I18N_STRICT ?? "")
	.split(",")
	.map((s) => s.trim())
	.filter(Boolean);
const forcedStrict = (code: string) => strictEnv.includes("all") || strictEnv.includes(code);

const render = (findings: Q.Finding[]) => findings.map((f) => `${f.code} ${f.key}: ${f.message}`);

/** Warnings that do not block yet, flushed once after the run so the output stays readable. */
const notices: string[] = [];
const noManifest: string[] = [];

afterAll(() => {
	if (noManifest.length) {
		notices.push(
			`no review manifest yet for ${noManifest.length} locale(s): ${noManifest.join(", ")} (manifestMode is "${allow.manifestMode}")`
		);
	}
	if (notices.length) console.warn(`[i18n] ${notices.join("\n[i18n] ")}`);
});

/** Record findings that do not block yet (the locale is not reviewed). */
function warnOnce(code: string, findings: Q.Finding[]) {
	if (findings.length === 0) return;
	const counts: Record<string, number> = {};
	for (const f of findings) counts[f.check] = (counts[f.check] ?? 0) + 1;
	const summary = Object.entries(counts)
		.map(([check, n]) => `${check} ${n}`)
		.join(", ");
	notices.push(
		`${code} (not reviewed): ${summary}. List: I18N_STRICT=${code} pnpm vitest run src/lib/i18n/catalog-quality.test.ts -t "catalog ${code}"`
	);
}

// =============================================================================
// 1. Fixtures: each check can fail
// =============================================================================

const emptyAllow: Q.Allowlist = {
	manifestMode: "warn",
	untranslated: { "*": {} },
	punctuation: { "*": {} },
	hygiene: { "*": {} },
	length: { "*": {} },
	deadKeys: { pendingConsumers: [] },
	staticChrome: [],
};

describe("quality checks: each one can fail", () => {
	const fxEn: Q.Dict = {
		"a.title": "Search the docs",
		"a.greet": "Hello {name}, you have {count} items!",
		"a.rich": "Read <b>this</b> and <link>that</link>.",
		"a.list": "Choose one:",
		"nav.home": "Home",
		"n.one": "{count} result",
		"n.other": "{count} results",
	};

	it("untranslated: flags a value identical to English, honours the allowlist", () => {
		const cat = { ...fxEn, "a.title": "Rechercher dans la doc" };
		const found = Q.checkUntranslated("fr", fxEn, cat, emptyAllow);
		expect(found.map((f) => f.key)).toContain("a.greet");
		expect(found.every((f) => f.check === "untranslated")).toBe(true);
		const allowed: Q.Allowlist = {
			...emptyAllow,
			untranslated: {
				"*": {},
				fr: {
					"a.greet": "x",
					"a.rich": "x",
					"a.list": "x",
					"nav.home": "x",
					"n.one": "x",
					"n.other": "x",
				},
			},
		};
		expect(Q.checkUntranslated("fr", fxEn, cat, allowed)).toEqual([]);
		expect(Q.checkUntranslated("fr", { n: "42" }, { n: "42" }, emptyAllow)).toEqual([]);
	});

	it("placeholders: flags a missing, extra or renamed placeholder", () => {
		const bad = { ...fxEn, "a.greet": "Bonjour {nom}, vous avez {count} éléments !" };
		expect(Q.checkPlaceholders("fr", fxEn, bad).map((f) => f.key)).toEqual(["a.greet"]);
		const dropped = { ...fxEn, "a.greet": "Bonjour, vous avez {count} éléments !" };
		expect(Q.checkPlaceholders("fr", fxEn, dropped)).toHaveLength(1);
		expect(Q.checkPlaceholders("fr", fxEn, { ...fxEn })).toEqual([]);
	});

	it("placeholders: a plural 'one' may say the number in words only where one means exactly 1", () => {
		const words = { ...fxEn, "n.one": "un résultat" };
		expect(Q.checkPlaceholders("de", fxEn, words)).toEqual([]);
		expect(Q.checkPlaceholders("fr", fxEn, words)).toHaveLength(1); // fr "one" covers 0 too
	});

	it("markup: flags a changed, missing or badly nested tag", () => {
		const renamed = { ...fxEn, "a.rich": "Lisez <strong>ceci</strong> et <link>cela</link>." };
		expect(Q.checkMarkup("fr", fxEn, renamed)).toHaveLength(1);
		const missing = { ...fxEn, "a.rich": "Lisez <b>ceci</b> et cela." };
		expect(Q.checkMarkup("fr", fxEn, missing)).toHaveLength(1);
		const crossed = { ...fxEn, "a.rich": "Lisez <b>ceci et <link>cela</b></link>." };
		expect(Q.checkMarkup("fr", fxEn, crossed)).toHaveLength(1);
		expect(
			Q.checkMarkup("fr", fxEn, { ...fxEn, "a.rich": "Lisez <b>ceci</b> et <link>cela</link>." })
		).toEqual([]);
		expect(Q.tagNestingError("<b>x")).toMatch(/never closed/);
		expect(Q.tagNestingError("x</b>")).toMatch(/unexpected/);
	});

	it("punctuation: flags a different ending class, accepts the script's own mark", () => {
		const bad = { ...fxEn, "a.list": "Choisissez" };
		expect(Q.checkPunctuation("fr", fxEn, bad, emptyAllow).map((f) => f.key)).toEqual(["a.list"]);
		const ja = {
			...fxEn,
			"a.list": "選択してください：",
			"a.greet": "こんにちは {name}、{count} 件あります！",
			"a.rich": "<b>これ</b>と<link>それ</link>を読む。",
		};
		expect(Q.checkPunctuation("ja", fxEn, ja, emptyAllow)).toEqual([]);
		expect(Q.endClass("Réponse :")).toBe("colon");
		expect(Q.endClass("كيف؟")).toBe("question");
		expect(Q.endClass("Rechercher...")).toBe("ellipsis");
		expect(Q.endClass("Voir <link>le thème</link>.")).toBe("stop");
	});

	it("hygiene fr: needs a no-break space before : ; ! ?", () => {
		expect(Q.hygieneProblems("fr", "Essayez plutôt :")).not.toEqual([]);
		expect(Q.hygieneProblems("fr", "Copié!")).not.toEqual([]);
		expect(Q.hygieneProblems("fr", "Essayez plutôt :")).toEqual([]);
		expect(Q.hygieneProblems("fr", "Copié !")).toEqual([]);
		expect(Q.hygieneProblems("fr", "https://exemple.fr")).toEqual([]);
	});

	it("hygiene pl/cs: a single-letter word must not be followed by an ordinary space", () => {
		expect(Q.hygieneProblems("pl", "Pole w formularzu")).not.toEqual([]);
		expect(Q.hygieneProblems("pl", "Pole w formularzu")).toEqual([]);
		expect(Q.hygieneProblems("cs", "Pole v kódu")).not.toEqual([]);
		expect(Q.hygieneProblems("cs", "Pole v kódu")).toEqual([]);
	});

	it("hygiene ja/zh: full-width punctuation next to CJK text", () => {
		expect(Q.hygieneProblems("ja", "コピーしました!")).not.toEqual([]);
		expect(Q.hygieneProblems("ja", "コピーしました！")).toEqual([]);
		expect(Q.hygieneProblems("zh-Hans", "复制，然后粘贴.")).not.toEqual([]);
		expect(Q.hygieneProblems("zh-Hans", "复制，然后粘贴。")).toEqual([]);
		expect(Q.hygieneProblems("ja", "Svelte, React")).toEqual([]);
	});

	it("hygiene ar/fa: Arabic comma, semicolon and question mark", () => {
		expect(Q.hygieneProblems("ar", "الأزرار, البطاقات")).not.toEqual([]);
		expect(Q.hygieneProblems("ar", "الأزرار، البطاقات")).toEqual([]);
		expect(Q.hygieneProblems("fa", "آیا؟")).toEqual([]);
		expect(Q.hygieneProblems("fa", "آیا ?")).not.toEqual([]);
	});

	it("hygiene everywhere: double spaces, stray '..' and doubled punctuation", () => {
		expect(Q.hygieneProblems("tr", "Kopyalandı..")).not.toEqual([]);
		expect(Q.hygieneProblems("tr", "Kopyalandı...")).toEqual([]);
		expect(Q.hygieneProblems("de", "Zwei  Leerzeichen")).not.toEqual([]);
		expect(Q.hygieneProblems("de", " vorne")).not.toEqual([]);
		expect(Q.hygieneProblems("de", "Wirklich,, ja")).not.toEqual([]);
	});

	it("length: budgets a short label at max(1.6x, +12) and honours overrides", () => {
		expect(Q.lengthBudget(4)).toBe(16);
		expect(Q.lengthBudget(20)).toBe(32);
		const cat = { ...fxEn, "nav.home": "Startseite mit sehr langem Namen" };
		const found = Q.checkLength("de", fxEn, cat, emptyAllow);
		expect(found.map((f) => f.key)).toEqual(["nav.home"]);
		const raised: Q.Allowlist = { ...emptyAllow, length: { "*": {}, de: { "nav.home": 40 } } };
		expect(Q.checkLength("de", fxEn, cat, raised)).toEqual([]);
		// Sentences and keys outside the label prefixes are not budgeted.
		expect(Q.checkLength("de", fxEn, { ...fxEn, "a.title": "x".repeat(300) }, emptyAllow)).toEqual(
			[]
		);
	});

	it("deadKeys: flags a key nothing reaches, unless a consumer is pending", () => {
		const used = new Set(["a"]);
		const found = Q.checkDeadKeys(["a", "b"], (k) => used.has(k), emptyAllow);
		expect(found.map((f) => f.key)).toEqual(["b"]);
		const pending: Q.Allowlist = { ...emptyAllow, deadKeys: { pendingConsumers: ["b"] } };
		expect(Q.checkDeadKeys(["a", "b"], (k) => used.has(k), pending)).toEqual([]);
	});

	it("deadKeys: the usage scan sees literals, plural bases and dynamic prefixes", () => {
		const usage = {
			literals: new Map([
				["gallery.results", "x:1"],
				["a.b", "y:2"],
			]),
			prefixes: new Map([["category.", "z:3"]]),
		};
		const pb = new Set(["gallery.results"]);
		expect(P.findUsage("a.b", usage, pb)).toBe("y:2");
		expect(P.findUsage("gallery.results.few", usage, pb)).toBe("x:1");
		expect(P.findUsage("category.cards", usage, pb)).toBe("z:3");
		expect(P.findUsage("nothing.here", usage, pb)).toBeNull();
	});

	it("manifest: absent warns, complete passes, stale or missing or extra fails, draft header fails", () => {
		const expected = { a: "h1", b: "h2" };
		expect(Q.checkManifest("fr", null, expected, false).absent).toBe(true);
		expect(Q.checkManifest("fr", { a: "h1", b: "h2" }, expected, false)).toEqual({
			findings: [],
			absent: false,
		});
		expect(Q.checkManifest("fr", { a: "h1" }, expected, false).findings.map((f) => f.key)).toEqual([
			"b",
		]);
		expect(
			Q.checkManifest("fr", { a: "h1", b: "OLD" }, expected, false).findings[0].message
		).toMatch(/stale/);
		expect(
			Q.checkManifest("fr", { a: "h1", b: "h2", c: "h3" }, expected, false).findings[0].key
		).toBe("c");
		expect(Q.checkManifest("fr", { a: "h1", b: "h2" }, expected, true).findings[0].key).toBe(
			"(header)"
		);
	});

	it("manifest: a plural group's hash covers every English variant", () => {
		const enList = [
			{ key: "n.one", value: "{count} result" },
			{ key: "n.other", value: "{count} results" },
		];
		const a = P.expectedManifest("fr", enList, [
			{ key: "n.one" },
			{ key: "n.other" },
			{ key: "n.many" },
		]);
		expect(a["n.one"]).toBe(a["n.other"]);
		expect(a["n.many"]).toBe(a["n.other"]);
		const b = P.expectedManifest(
			"fr",
			[{ key: "n.one", value: "{count} result!" }, enList[1]],
			[{ key: "n.one" }, { key: "n.other" }]
		);
		expect(b["n.one"]).not.toBe(a["n.one"]);
	});

	it("plural structure: requires the CLDR categories of the locale and rejects foreign ones", () => {
		const enP = { "n.one": "{count} a", "n.other": "{count} b" };
		const ok = { "n.one": "x", "n.few": "y", "n.many": "y", "n.other": "z" };
		expect(Q.checkPluralStructure("pl", enP, ok, ["one", "few", "many", "other"])).toEqual([]);
		const missing = { "n.one": "x", "n.other": "z" };
		expect(
			Q.checkPluralStructure("pl", enP, missing, ["one", "few", "many", "other"]).map((f) => f.key)
		).toEqual(["n.few", "n.many"]);
		const foreign = { "n.other": "z", "n.few": "y" };
		expect(Q.checkPluralStructure("ja", enP, foreign, ["other"])[0].message).toMatch(
			/does not exist/
		);
		expect(
			Q.checkPluralStructure(
				"fr",
				enP,
				{ "n.one": "x", "n.many": "y", "n.other": "z" },
				["one", "other"],
				["many"]
			)
		).toEqual([]);
	});

	it("static chrome: flags literal English text and attributes, ignores code, data and mustaches", () => {
		const svelte = `<script>const a = "ignored text here";</script>
<h1>Welcome to the docs</h1>
<button aria-label="Close search" title={t("x")}>{t("y")}</button>
<code>some code sample</code>
<p>{count} items</p>
<!-- a comment in English -->
<link rel="alternate" title="Markdown alternate" />
<input placeholder="Type to filter" />`;
		const hits = P.scanSvelteSource(svelte) as { kind: string; text: string }[];
		expect(hits.map((h) => `${h.kind}:${h.text}`)).toEqual([
			"text:Welcome to the docs",
			"aria-label:Close search",
			"text:items",
			"placeholder:Type to filter",
		]);
		const found = Q.checkStaticChrome(
			[{ file: "a.svelte", line: 2, kind: "text", text: "Welcome to the docs" }],
			emptyAllow
		);
		expect(found).toHaveLength(1);
		const ok: Q.Allowlist = {
			...emptyAllow,
			staticChrome: [{ file: "a.svelte", text: "Welcome to the docs", reason: "test" }],
		};
		expect(
			Q.checkStaticChrome(
				[{ file: "a.svelte", line: 2, kind: "text", text: "Welcome to the docs" }],
				ok
			)
		).toEqual([]);
	});

	it("static chrome: single words and Title Case labels are English too; brands and identifiers are not", () => {
		const svelte = `<button aria-label="Previous" title="Copy"><span>Preview</span></button>
<p>Code</p>
<h2>Browse Components</h2>
<a href="/docs">Docs</a>
<ol><li>Recipes</li></ol>
<b>FancyUI</b> <i>FluidCursor</i> <i>CLI</i> <i>npm</i> <i>GitHub</i> <i>OKLCh</i>
<span>12</span> <span>→</span> <span>{count}</span> <span>à</span>`;
		const hits = (P.scanSvelteSource(svelte) as { kind: string; text: string }[]).map(
			(h) => `${h.kind}:${h.text}`
		);
		expect(hits).toEqual([
			"aria-label:Previous",
			"title:Copy",
			"text:Preview",
			"text:Code",
			"text:Browse Components",
			"text:Docs",
			"text:Recipes",
		]);
		expect(P.looksLikeEnglish("Settings")).toBe(true);
		expect(P.looksLikeEnglish("copy")).toBe(true);
		expect(P.looksLikeEnglish("FancyUI")).toBe(false);
		expect(P.looksLikeEnglish("v1.2")).toBe(false);
	});

	it("parser: reads keys, values, @context comments and refuses anything else", () => {
		const src = `// header\nexport const en = {\n\t// section\n\t/** @context First. */\n\t"a.b": "One",\n\t"c.d":\n\t\t"Two {x}",\n} as const;`;
		const { entries, header } = P.parseCatalogSource(src);
		expect(header).toBe("// header");
		expect(
			entries.map((e: { key: string; value: string; context: string | null }) => [
				e.key,
				e.value,
				e.context,
			])
		).toEqual([
			["a.b", "One", "First."],
			["c.d", "Two {x}", null],
		]);
		expect(() => P.parseCatalogSource('export default {\n"a": `tpl`,\n}')).toThrow(/plain string/);
	});
});

// =============================================================================
// 2. Runtime: format, plurals, rich text, the store
// =============================================================================

describe("format runtime", () => {
	it("interpolate fills placeholders, formats numbers per locale, leaves unknown ones visible", () => {
		expect(F.interpolate("Name in {framework}", { framework: "React" })).toBe("Name in React");
		expect(F.interpolate("{count} results", { count: 1234 }, "en")).toBe("1,234 results");
		expect(F.interpolate("{count} résultats", { count: 1234 }, "de")).toBe("1.234 résultats");
		expect(F.interpolate("{count}", { count: 1234 }, "fr")).toBe("1 234");
		expect(F.interpolate("{a} {b}", { a: "x" })).toBe("x {b}");
		expect(F.interpolate("{__proto__} {constructor}", { a: "x" })).toBe(
			"{__proto__} {constructor}"
		);
		expect(F.interpolate("no placeholders")).toBe("no placeholders");
		expect(F.interpolate("v{version}", { version: "0.16.0" })).toBe("v0.16.0");
	});

	it("pluralCategory follows CLDR for the locales with more than one-or-other", () => {
		const pick = (loc: string, ns: number[]) => ns.map((n) => F.pluralCategory(n, loc));
		expect(pick("en", [0, 1, 2])).toEqual(["other", "one", "other"]);
		expect(pick("fr", [0, 1, 2])).toEqual(["one", "one", "other"]);
		expect(pick("ar", [0, 1, 2, 3, 11, 100])).toEqual([
			"zero",
			"one",
			"two",
			"few",
			"many",
			"other",
		]);
		expect(pick("pl", [1, 2, 5, 22, 25])).toEqual(["one", "few", "many", "few", "many"]);
		expect(pick("cs", [1, 3, 5])).toEqual(["one", "few", "other"]);
		expect(pick("ja", [0, 1, 5])).toEqual(["other", "other", "other"]);
	});

	it("resolvePlural prefers the locale's category, then its .other, then English", () => {
		const cat = { "k.one": "uno", "k.other": "otros" };
		const en = { "k.one": "one", "k.other": "other", "z.one": "z one", "z.other": "z other" };
		const get = (o: Record<string, string>) => (key: string) => o[key];
		expect(F.resolvePlural(get(cat), get(en), "k", 1, "es")).toBe("uno");
		expect(F.resolvePlural(get(cat), get(en), "k", 5, "es")).toBe("otros");
		// Category the catalog lacks ("few" in pl) falls back to its own .other, not to English.
		expect(F.resolvePlural(get(cat), get(en), "k", 3, "pl")).toBe("otros");
		// Key the catalog lacks entirely falls back to English by English's category.
		expect(F.resolvePlural(get(cat), get(en), "z", 1, "pl")).toBe("z one");
		expect(F.resolvePlural(get(cat), get(en), "z", 7, "pl")).toBe("z other");
		expect(F.resolvePlural(get(cat), get(en), "nope", 1, "pl")).toBe("nope");
	});

	it("formatPlural supplies {count} and extra variables", () => {
		const cat = {
			"r.one": "{count} composant dans {n} catégories",
			"r.other": "{count} composants dans {n} catégories",
		};
		const get = (key: string) => (cat as Record<string, string>)[key];
		expect(F.formatPlural(get, () => undefined, "r", 1, "fr", { n: 3 })).toBe(
			"1 composant dans 3 catégories"
		);
		expect(F.formatPlural(get, () => undefined, "r", 152, "fr", { n: 3 })).toBe(
			"152 composants dans 3 catégories"
		);
	});

	it("parseRich turns the closed tag set into typed segments and nothing else", () => {
		const segs = F.parseRich("a <b>bold {n}</b> and <link>go <grad>there</grad></link>.", { n: 2 });
		expect(segs).toEqual([
			{ type: "text", text: "a " },
			{ type: "b", children: [{ type: "text", text: "bold 2" }] },
			{ type: "text", text: " and " },
			{
				type: "link",
				children: [
					{ type: "text", text: "go " },
					{ type: "grad", children: [{ type: "text", text: "there" }] },
				],
			},
			{ type: "text", text: "." },
		]);
		expect(F.plainText(segs)).toBe("a bold 2 and go there.");
	});

	it("parseRich keeps unknown tags as text, and a variable can never inject a tag", () => {
		expect(F.plainText(F.parseRich("Put it on <html> or <div>"))).toBe("Put it on <html> or <div>");
		const injected = F.parseRich("hi {name}", { name: "<b>x</b>" });
		expect(injected).toEqual([{ type: "text", text: "hi <b>x</b>" }]);
	});

	it("parseRich is tolerant of broken nesting at runtime", () => {
		expect(F.plainText(F.parseRich("a</b> <b>b"))).toBe("a b");
		expect(F.parseRich("<b>open")).toEqual([
			{ type: "b", children: [{ type: "text", text: "open" }] },
		]);
	});
});

describe("catalogs through the store: t, tn, tx", () => {
	it("t() fills variables and falls back to English", () => {
		setLocale("en");
		expect(t("table.portName", { framework: "Vue" })).toBe("Name in Vue");
		expect(t("table.portName")).toBe("Name in {framework}");
	});

	it("tn() picks singular and plural in English", () => {
		setLocale("en");
		expect(tn("gallery.results", 1)).toBe("1 result");
		expect(tn("gallery.results", 12)).toBe("12 results");
		expect(tn("intro.whatsIncluded.body", 152, { categories: 10 })).toBe(
			"152 components across 10 categories:"
		);
	});

	it("tn() uses the active locale's categories", () => {
		setLocale("ar");
		const out = [0, 1, 2, 3, 11, 100].map((n) => tn("gallery.results", n));
		expect(out).toHaveLength(6);
		expect(out[1]).toBe(catalogs.ar["gallery.results.one"]);
		expect(out[3]).toContain("3");
		setLocale("pl");
		expect(tn("gallery.results", 5)).toBe(
			(catalogs.pl["gallery.results.many"] as string).replace("{count}", "5")
		);
		setLocale("en");
	});

	it("tx() returns segments with the markup of the active locale", () => {
		setLocale("en");
		const segs = tx("intro.lead", { count: 152 });
		expect(segs.some((s) => s.type === "grad")).toBe(true);
		expect(F.plainText(segs)).toContain("152");
		const cta = tx("intro.cta.body");
		expect(cta.some((s) => s.type === "b")).toBe(true);
		const tg = tx("tg.intro");
		expect(tg.some((s) => s.type === "link")).toBe(true);
	});
});

// =============================================================================
// 3. The real catalogs
// =============================================================================

describe("catalog sources", () => {
	it("locales.ts and the catalog files agree, and the registry loads every catalog", () => {
		const fromLocales = (P.parseLocales() as { code: string }[]).map((l) => l.code).sort();
		expect([...codes, "en"].sort()).toEqual(fromLocales);
		expect(locales.map((l) => l.code).sort()).toEqual(fromLocales);
		expect(Object.keys(catalogs).sort()).toEqual(fromLocales);
	});

	it("English keys are unique, and every plural base has `one` and `other`", () => {
		const keys = enEntries.map((e) => e.key);
		expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
		for (const base of bases) {
			expect(en, `${base}.one`).toHaveProperty([`${base}.one`]);
			expect(en, `${base}.other`).toHaveProperty([`${base}.other`]);
		}
		expect(bases.size).toBeGreaterThan(0);
	});

	it("the plural categories this suite pins match what Intl selects", () => {
		for (const code of [...codes, "en"]) {
			const allowedCats = new Set(P.allowedPlurals(code));
			const seen = new Set<string>();
			for (const n of [...Array(201).keys(), 1000, 1e6, 1e7]) seen.add(F.pluralCategory(n, code));
			for (const c of seen) expect(allowedCats.has(c), `${code} selects "${c}"`).toBe(true);
		}
	});

	it("English @context comments exist where translators need them", () => {
		const ctx = new Map(enEntries.map((e) => [e.key, e.context]));
		const need = (key: string) => expect(ctx.get(key), `@context on ${key}`).toBeTruthy();
		for (const { key } of enEntries) {
			if (/^(jobs|page|status|skin)\./.test(key)) need(key);
			if (
				key === "search.tryInstead" ||
				key === "comp.inspiredBy" ||
				key.startsWith("table.portName")
			)
				need(key);
		}
	});

	it("messages/context.json is the output of scripts/i18n-context.mjs", () => {
		const onDisk = JSON.parse(readFileSync(P.contextPath, "utf8"));
		expect(ContextGen.withoutRender(onDisk), "run: node scripts/i18n-context.mjs").toEqual(
			ContextGen.withoutRender(ContextGen.buildContext())
		);
		expect(Object.keys(onDisk)).toEqual(Object.keys(en));
	});
});

describe.each(codes)("catalog %s", (code) => {
	const parsed = P.parseCatalog(code) as {
		header: string;
		entries: { key: string; value: string }[];
	};
	const cat = P.entriesToMap(parsed.entries) as Q.Dict;
	const manifest = P.readManifest(code) as Record<string, string> | null;
	const reviewed = manifest !== null || forcedStrict(code);

	it("has the English keys and the plural categories CLDR requires", () => {
		const nonPluralEn = Object.keys(en).filter((k) => !Q.splitPlural(k, bases));
		const nonPlural = Object.keys(cat).filter((k) => !Q.splitPlural(k, bases));
		expect(nonPlural.sort()).toEqual(nonPluralEn.sort());
		const dupes = parsed.entries.map((e) => e.key).filter((k, i, a) => a.indexOf(k) !== i);
		expect(dupes).toEqual([]);
		expect(
			render(
				Q.checkPluralStructure(
					code,
					en,
					cat,
					P.REQUIRED_PLURALS[code],
					P.OPTIONAL_PLURALS[code] ?? []
				)
			)
		).toEqual([]);
	});

	it("keeps placeholders and markup in step with English", () => {
		expect(
			render([...Q.checkPlaceholders(code, en, cat), ...Q.checkMarkup(code, en, cat)])
		).toEqual([]);
	});

	it("is translated, punctuated, typeset and sized like English", () => {
		const findings = [
			...Q.checkUntranslated(code, en, cat, allow),
			...Q.checkPunctuation(code, en, cat, allow),
			...Q.checkHygiene(code, cat, allow),
			...Q.checkLength(code, en, cat, allow),
		];
		if (reviewed) expect(render(findings)).toEqual([]);
		else warnOnce(code, findings);
	});

	it("has a complete, current review manifest", () => {
		const expected = P.expectedManifest(code, enEntries, parsed.entries) as Record<string, string>;
		const result = Q.checkManifest(code, manifest, expected, P.hasDraftHeader(parsed.header));
		if (result.absent && allow.manifestMode !== "fail") {
			noManifest.push(code);
			return;
		}
		expect(render(result.findings)).toEqual([]);
	});
});

// =============================================================================
// 4. Source-tree scans
// =============================================================================

describe("source scans", () => {
	it("every English key is used by the app, or listed as awaiting its consumer", () => {
		const usage = P.scanKeyUsage();
		const isUsed = (key: string) => P.findUsage(key, usage, bases) !== null;
		expect(render(Q.checkDeadKeys(Object.keys(en), isUsed, allow))).toEqual([]);
		const stale = allow.deadKeys.pendingConsumers.filter((k) => isUsed(k));
		if (stale.length) {
			notices.push(
				`${stale.length} key(s) in deadKeys.pendingConsumers are used now, remove them: ${stale.join(", ")}`
			);
		}
		const unknown = allow.deadKeys.pendingConsumers.filter((k) => !(k in en));
		expect(unknown, "pendingConsumers lists keys that do not exist").toEqual([]);
	});

	it("the docs chrome has no literal English text, aria-label, title or placeholder", () => {
		const hits = P.scanStaticChrome() as Q.ChromeHit[];
		expect(render(Q.checkStaticChrome(hits, allow))).toEqual([]);
		const live = new Set(hits.map((h) => `${h.file}|${h.text}`));
		const stale = allow.staticChrome.filter((a) => !live.has(`${a.file}|${a.text}`));
		if (stale.length) {
			notices.push(
				`static-chrome allowlist has ${stale.length} entry(ies) that no longer match: ${stale
					.map((a) => `${a.file} "${a.text}"`)
					.join("; ")}`
			);
		}
	});
});
