import { describe, expect, it } from "vitest";
import { catalogs } from "./messages/index.js";
import en from "./messages/en.js";

/** Keys registered for the docs audit (chrome, contribution, status, recipes, errors, SEO). */
const AUDIT_KEYS = [
	"a11y.skipToContent",
	"a11y.docsBreadcrumb",
	"a11y.prevNext",
	"a11y.search",
	"search.a11y.close",
	"nav.backToSite",
	"nav.recipes",
	"toc.show",
	"footer.docs",
	"footer.contribute",
	"footer.issues",
	"footer.discussions",
	"footer.security",
	"footer.conduct",
	"footer.changelog",
	"footer.versions",
	"footer.install",
	"footer.license",
	"comp.editPage",
	"comp.reportIssue",
	"comp.issueTitle",
	"intro.lead",
	"intro.importHint",
	"install.kitOptional",
	"theming.cssPerFramework",
	"status.planned",
	"status.deprecated",
	"comp.sinceVersion",
	"comp.deprecatedNotice",
	"comp.inspiredByNoLink",
	"recipes.title",
	"recipes.lead",
	"recipes.components",
	"error.notFoundTitle",
	"error.genericTitle",
	"error.notFoundBody",
	"error.genericBody",
	"error.unauthorizedTitle",
	"error.unauthorizedBody",
	"error.home",
	"error.browse",
	"error.search",
	"error.report",
	"comp.previewFailed",
	"demo.noPreview",
	"demo.notFound",
	"recipes.steps",
	"recipes.pitfalls",
	"recipes.componentsUsed",
	"seo.introduction",
	"seo.installation",
	"seo.theming",
	"seo.themeGenerator",
	"seo.changelog",
] as const;

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");

// Terms that legitimately stay identical to English in some locales.
const MAY_MATCH_ENGLISH = new Set([
	"footer.issues",
	"footer.discussions",
	"footer.versions",
	"footer.changelog",
	"comp.issueTitle",
]);

describe("docs audit message keys", () => {
	it("registers all 54 keys in the English source", () => {
		for (const key of AUDIT_KEYS) expect(en, key).toHaveProperty([key]);
		expect(AUDIT_KEYS).toHaveLength(54);
	});

	const others = Object.entries(catalogs).filter(([code]) => code !== "en");

	it("covers the 15 other locales", () => {
		expect(others).toHaveLength(15);
	});

	for (const [code, cat] of others) {
		it(`${code}: has every key, keeps placeholders, is really translated`, () => {
			for (const key of AUDIT_KEYS) {
				const value = (cat as Record<string, string>)[key];
				const source = (en as Record<string, string>)[key];
				expect(value, `${code} ${key}`).toBeTruthy();
				expect(placeholders(value), `${code} ${key} placeholders`).toBe(placeholders(source));
				if (!MAY_MATCH_ENGLISH.has(key)) {
					expect(value, `${code} ${key} is an English copy`).not.toBe(source);
				}
			}
		});
	}
});
