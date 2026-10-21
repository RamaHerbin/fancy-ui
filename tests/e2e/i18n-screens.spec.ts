import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { routeGithubApi } from "./_helpers/console-guard";
import ar from "../../src/lib/i18n/messages/ar";
import de from "../../src/lib/i18n/messages/de";
import fa from "../../src/lib/i18n/messages/fa";
import fr from "../../src/lib/i18n/messages/fr";
import ja from "../../src/lib/i18n/messages/ja";
import pl from "../../src/lib/i18n/messages/pl";

/**
 * Layout sweep for the locales that stress the docs chrome: long words
 * (de, fr, pl), right-to-left (ar, fa) and CJK (ja). Each page is loaded with
 * `?lang=<code>` at a phone and a desktop width, in both colour schemes, and
 * checked for:
 *
 * - `html[lang]` and `dir` matching the locale;
 * - no horizontal page scroll: the layout viewport is compared with the
 *   configured width (as in site-mobile.spec.ts), and every element that
 *   pokes past either edge outside a scroll container is reported;
 * - no clipped label in the sidebar, chips, pagination, breadcrumb, header
 *   controls, page controls, footer and search palette
 *   (`scrollWidth <= clientWidth + 1`; inline labels: text box inside the
 *   parent box);
 * - fa only: counts and ordinals in one digit system. Versions (0.16.0),
 *   names with a number ("Svelte 5", "Card3D"), demos and code are
 *   identifiers, not counts, and are ignored.
 *
 * Screenshots go to I18N_SCREENS_DIR (default test-results/i18n-screens) for
 * a human read: wrong wraps, mirrored icons and awkward breaks are judged from
 * the images, not asserted.
 *
 * KNOWN lists defects found by this sweep and routed to their owner. A match
 * is reported as an annotation instead of failing; anything else fails.
 * I18N_SCREENS_STRICT=1 ignores KNOWN. Delete an entry with its fix.
 */

const SCREENS_DIR = process.env.I18N_SCREENS_DIR ?? join("test-results", "i18n-screens");
const STRICT = process.env.I18N_SCREENS_STRICT === "1";

const CATALOGS = { de, fr, pl, ar, fa, ja } as const;
type Locale = keyof typeof CATALOGS;
const LOCALES = Object.keys(CATALOGS) as Locale[];
const RTL = new Set<Locale>(["ar", "fa"]);

const WIDTHS = [375, 1280] as const;
const SCHEMES = ["dark", "light"] as const;
const PHONE = 640;

const PAGES = [
	{ id: "introduction", path: "/docs/getting-started/introduction" },
	{ id: "installation", path: "/docs/getting-started/installation" },
	{ id: "theming", path: "/docs/getting-started/theming" },
	{ id: "theme-generator", path: "/docs/getting-started/theme-generator" },
	{ id: "button", path: "/docs/components/button" },
] as const;

/** Labels the sweep measures. Demos and code are excluded (EXCLUDED). */
const LABELS = [
	// Sidebar
	"aside [data-docs-brand]",
	"aside nav a",
	"aside nav button",
	"aside .docs-sidebar-cta",
	// Header: breadcrumb and controls
	'header [data-docs-crumbs] [aria-current="page"]',
	"header [data-docs-crumbs] a",
	"header [data-docs-controls] button",
	"header [data-docs-controls] a",
	// Chips
	"main [data-badge]",
	"main span[data-category]",
	".docs-footer-chip",
	// Pagination
	'a[rel="prev"]',
	'a[rel="next"]',
	".retro-pager-eyebrow",
	".retro-pager-name",
	// Page body and footer
	"details[data-toc-compact] > summary",
	"main h1",
	"main h2",
	"main h3",
	"main a",
	"main button",
	"main label",
	"main [role=tab]",
	"main th",
	".docs-footer a",
].join(", ");

const PALETTE_LABELS = "[data-c2-palette] button, [data-c2-palette] kbd, [data-c2-palette] p";

/** Inside these, content is a demo or code, not docs chrome. */
const EXCLUDED = "[data-thumb-stage], [data-pane], pre, code";

type Kind = "clip" | "overflow" | "digits";

interface Finding {
	kind: Kind;
	/** Ancestor path with tag, data-*, rel, role and class hooks. */
	path: string;
	text: string;
	detail: string;
}

interface Known {
	id: string;
	owner: string;
	kind: Kind;
	/** Matched against the finding's path. */
	path: RegExp;
	locales?: Locale[];
	maxWidth?: number;
}

const KNOWN: Known[] = [
	{
		// The phone header leaves the current crumb 53 px next to six controls:
		// "Introduction" or "Theme Generator" are cut in English too.
		id: "crumb-phone",
		owner: "C0 (DocHeader layout)",
		kind: "clip",
		path: /nav\[data-docs-crumbs\]/,
		maxWidth: PHONE,
	},
	{
		// The package-manager tab row does not wrap: "Kopieren" pushes the copy
		// button 20 px past a 375 px screen.
		id: "install-tabs-phone",
		owner: "C0 (InstallBlock tab row)",
		kind: "overflow",
		path: /\.retro-pmtabs/,
		maxWidth: PHONE,
	},
	{
		// Step numbers are literal "1 2 3" in the markup while counts use the
		// locale's digits.
		id: "intro-step-digits",
		owner: "C0 (IntroductionPage markup)",
		kind: "digits",
		path: /div\.num\b/,
		locales: ["fa"],
	},
	{
		// The star count is formatted with a fixed "en" number format.
		id: "stars-digits",
		owner: "C0 (GitHubStars number format)",
		kind: "digits",
		path: /a\.retro-gh/,
		locales: ["fa"],
	},
];

interface Probe {
	scrollWidth: number;
	clips: Finding[];
	overflow: Finding[];
	asciiCounts: Finding[];
	nativeDigits: number;
	mirrored: string[];
}

/** One pass over the page: clipped labels, edge overflow, digits, mirrored icons. */
async function probe(page: Page, width: number, labels: string): Promise<Probe> {
	return page.evaluate(
		({ width, labels, excluded }) => {
			const describe = (el: Element) => {
				const parts: string[] = [];
				let node: Element | null = el;
				while (node && node !== document.body && parts.length < 5) {
					const hooks = [...node.attributes]
						.filter((a) => a.name.startsWith("data-") || a.name === "rel" || a.name === "role")
						.map((a) => `[${a.name}${a.value ? `="${a.value}"` : ""}]`)
						.join("");
					const cls =
						typeof node.className === "string"
							? node.className
									.split(/\s+/)
									.filter((c) => /^(retro|docs|num|step|intro)/.test(c))
									.map((c) => `.${c}`)
									.join("")
							: "";
					parts.unshift(node.tagName.toLowerCase() + cls + hooks);
					node = node.parentElement;
				}
				return parts.join(" > ");
			};
			const textOf = (el: Element) =>
				(el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80);

			// Clipped labels
			const clips = [];
			for (const el of document.querySelectorAll<HTMLElement>(labels)) {
				if (el.closest(excluded)) continue;
				const rect = el.getBoundingClientRect();
				if (rect.width === 0 || rect.height === 0) continue;
				if (getComputedStyle(el).visibility === "hidden") continue;
				const text = textOf(el);
				if (!text) continue;
				let detail = "";
				if (el.clientWidth > 0) {
					if (el.scrollWidth > el.clientWidth + 1)
						detail = `scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`;
				} else if (el.parentElement) {
					// Inline label: its text box against the parent's content box.
					const range = document.createRange();
					range.selectNodeContents(el);
					const box = range.getBoundingClientRect();
					const host = el.parentElement;
					if (box.width > host.clientWidth + 1 && host.scrollWidth > host.clientWidth + 1)
						detail = `text ${Math.round(box.width)} > parent ${host.clientWidth}`;
				}
				if (!detail) {
					// Cut by an ancestor that hides overflow (scroll containers are fine).
					for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
						const ox = getComputedStyle(a).overflowX;
						if (ox === "visible") continue;
						if (ox === "hidden" || ox === "clip") {
							const box = a.getBoundingClientRect();
							if (rect.left < box.left - 1 || rect.right > box.right + 1)
								detail = `box ${Math.round(rect.left)}–${Math.round(rect.right)} outside clipping ancestor ${Math.round(box.left)}–${Math.round(box.right)}`;
						}
						break;
					}
				}
				if (detail) clips.push({ kind: "clip" as const, path: describe(el), text, detail });
			}

			// Elements past either edge, outside fixed layers and scroll containers
			const overflow = [];
			const contained = (el: Element) => {
				for (let a: Element | null = el; a && a !== document.documentElement; a = a.parentElement) {
					const cs = getComputedStyle(a);
					if (cs.position === "fixed") return true;
					if (a !== el && cs.overflowX !== "visible") return true;
				}
				return false;
			};
			for (const el of document.body.querySelectorAll("*")) {
				const r = el.getBoundingClientRect();
				if (r.width === 0 || (r.right <= width + 1 && r.left >= -1)) continue;
				if (contained(el)) continue;
				// Report the outermost offender only.
				if (overflow.some((o) => o.el.contains(el))) continue;
				overflow.push({
					el,
					kind: "overflow" as const,
					path: describe(el),
					text: textOf(el),
					detail: `left ${Math.round(r.left)}, right ${Math.round(r.right)}`,
				});
			}

			// Digits: ASCII counts and native (Persian / Arabic-Indic) digits
			const asciiCounts = [];
			let nativeDigits = 0;
			const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
			for (let n = walker.nextNode(); n; n = walker.nextNode()) {
				const parent = n.parentElement;
				if (!parent || parent.closest(`${excluded}, kbd, script, style, svg`)) continue;
				if (parent.getClientRects().length === 0) continue;
				const raw = n.textContent ?? "";
				if (/[۰-۹٠-٩]/.test(raw)) nativeDigits++;
				const counts = raw
					.replace(/\d+(?:\.\d+)+/g, "")
					.replace(/[A-Za-z][\w-]*(?:\s+[A-Za-z][\w-]*)*\s+\d+/g, "")
					.replace(/[A-Za-z_-]+\d+[\w-]*/g, "");
				if (/[0-9]/.test(counts))
					asciiCounts.push({
						kind: "digits" as const,
						path: describe(parent),
						text: raw.trim().slice(0, 80),
						detail: "ASCII digits",
					});
			}

			// Mirrored graphics (negative x scale), for the human read
			const mirrored = [...document.querySelectorAll("svg, img")]
				.filter((el) => el.getClientRects().length > 0)
				.filter((el) => {
					for (let a: Element | null = el; a; a = a.parentElement) {
						const m = /^matrix\(([-\d.e]+)/.exec(getComputedStyle(a).transform);
						if (m && Number(m[1]) < 0) return true;
					}
					return false;
				})
				.map((el) => describe(el));

			return {
				scrollWidth: document.documentElement.scrollWidth,
				clips,
				overflow: overflow.map(({ el: _el, ...rest }) => rest),
				asciiCounts,
				nativeDigits,
				mirrored,
			};
		},
		{ width, labels, excluded: EXCLUDED }
	);
}

/** Drop known, routed defects (reported as annotations); return the rest. */
function unknown(findings: Finding[], locale: Locale, width: number): Finding[] {
	return findings.filter((f) => {
		if (STRICT) return true;
		const known = KNOWN.find(
			(k) =>
				k.kind === f.kind &&
				k.path.test(f.path) &&
				(!k.locales || k.locales.includes(locale)) &&
				(!k.maxWidth || width < k.maxWidth)
		);
		if (!known) return true;
		test.info().annotations.push({
			type: `known:${known.id}`,
			description: `${known.owner} — ${f.text} (${f.detail})`,
		});
		return false;
	});
}

async function expectLayout(page: Page, locale: Locale, width: number, labels = LABELS) {
	const p = await probe(page, width, labels);
	const overflow = unknown(p.overflow, locale, width);
	expect(overflow, "elements past the screen edge").toEqual([]);
	if (overflow.length === 0 && p.overflow.length === 0) {
		expect(p.scrollWidth, "page scrolls horizontally").toBeLessThanOrEqual(width);
	}
	expect(unknown(p.clips, locale, width), "clipped labels").toEqual([]);
	if (locale === "fa" && p.nativeDigits > 0) {
		expect(unknown(p.asciiCounts, locale, width), "ASCII counts next to Persian digits").toEqual(
			[]
		);
	}
	if (RTL.has(locale) && p.mirrored.length > 0) {
		test.info().annotations.push({ type: "mirrored", description: p.mirrored.join("\n") });
	}
}

async function open(page: Page, locale: Locale, path: string) {
	await page.goto(`${path}?lang=${locale}`);
	await page.waitForLoadState("networkidle");
	// Hydrated: the breadcrumb label is the catalog's, not the server's English.
	await expect(page.locator("header [data-docs-crumbs]")).toHaveAttribute(
		"aria-label",
		CATALOGS[locale]["a11y.docsBreadcrumb"]
	);
	await expect(page.locator("html")).toHaveAttribute("lang", locale);
	await expect(page.locator("html")).toHaveAttribute("dir", RTL.has(locale) ? "rtl" : "ltr");
	await page.evaluate(() => document.fonts.ready);
}

async function shoot(page: Page, name: string) {
	mkdirSync(SCREENS_DIR, { recursive: true });
	await page.screenshot({ path: join(SCREENS_DIR, `${name}.png`) });
}

test.beforeEach(async ({ page }) => {
	await routeGithubApi(page);
	// Analytics beacon: keep the sweep off the network.
	await page.route("https://stats.rama.app/**", (route) => route.fulfill({ body: "" }));
});

for (const locale of LOCALES) {
	for (const width of WIDTHS) {
		for (const scheme of SCHEMES) {
			test.describe(`${locale} · ${width} px · ${scheme}`, () => {
				test.use({
					viewport: { width, height: 800 },
					colorScheme: scheme,
					...(width < PHONE ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
				});

				test.beforeEach(async ({ page }) => {
					await page.addInitScript((value) => {
						try {
							localStorage.setItem("fancy-ui-theme", value);
						} catch {
							// Private mode: the scheme falls back to colorScheme.
						}
					}, scheme);
				});

				for (const { id, path } of PAGES) {
					test(id, async ({ page }) => {
						await open(page, locale, path);
						const name = `${locale}-${width}-${scheme}-${id}`;
						// Component pages move focus (and the scroll) on load: start at the top.
						await page.evaluate(() => window.scrollTo(0, 0));
						await page.waitForTimeout(150);
						await shoot(page, `${name}-top`);
						await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
						await page.waitForTimeout(150);
						// Bottom of the page: pagination, page actions, footer chips.
						await shoot(page, `${name}-end`);
						await expectLayout(page, locale, width);

						if (width < PHONE && id === "introduction") {
							// Phones: the sidebar is off-canvas; open it to measure its labels.
							await page.evaluate(() => window.scrollTo(0, 0));
							await page.locator("header > button").first().click();
							await expect
								.poll(async () => (await page.locator("aside").boundingBox())?.x)
								.toBe(RTL.has(locale) ? width - 256 : 0);
							await shoot(page, `${name}-menu`);
							await expectLayout(page, locale, width);
						}
					});
				}

				test("search palette", async ({ page }) => {
					await open(page, locale, "/docs/components/button");
					await page
						.locator(width < PHONE ? "header button.docs-search-icon" : "header button.docs-search")
						.click();
					const dialog = page
						.locator('[role="dialog"]:not([inert])')
						.filter({ has: page.locator("input") });
					await expect(dialog).toBeVisible();
					await dialog.evaluate((el) => el.setAttribute("data-c2-palette", ""));
					const input = dialog.locator("input");
					await input.fill("but");
					await expect(dialog.locator("button").first()).toBeVisible();
					const name = `${locale}-${width}-${scheme}-palette`;
					await shoot(page, `${name}-results`);
					await expectLayout(page, locale, width, PALETTE_LABELS);

					// No match: the suggestion chips.
					await input.fill("zzqx");
					await expect(page.getByTestId("search-no-results")).toBeVisible();
					await shoot(page, `${name}-empty`);
					await expectLayout(page, locale, width, PALETTE_LABELS);
				});
			});
		}
	}
}
