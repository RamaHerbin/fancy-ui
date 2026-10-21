/**
 * The inline script in src/app.html runs before first paint. It must set `lang`
 * and `dir` only from a persisted, supported locale choice, so a first visit
 * from an Arabic-language browser never mirrors the English server render.
 */

import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appHtmlPath } from "../../../scripts/lib/i18n-parse.mjs";

const html = readFileSync(appHtmlPath, "utf8");
const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1];

function run(path: string, search: string, saved: string | null, navigatorLanguage = "en-US") {
	window.history.replaceState(null, "", `${path}${search}`);
	localStorage.clear();
	if (saved !== null) localStorage.setItem("fancy-ui-locale", saved);
	Object.defineProperty(window.navigator, "language", {
		value: navigatorLanguage,
		configurable: true,
	});
	const root = document.documentElement;
	root.lang = "en";
	root.removeAttribute("dir");
	new Function(script!)();
	return { lang: root.lang, dir: root.getAttribute("dir") };
}

describe("src/app.html pre-paint locale", () => {
	beforeEach(() => {
		window.matchMedia = ((query: string) => ({
			matches: false,
			media: query,
			addEventListener() {},
			removeEventListener() {},
		})) as unknown as typeof window.matchMedia;
	});
	afterEach(() => {
		localStorage.clear();
		window.history.replaceState(null, "", "/");
	});

	it("has the inline script to test", () => {
		expect(script).toContain("fancy-ui-locale");
	});

	it("does nothing on a first visit, even from an Arabic browser", () => {
		expect(run("/docs/components", "", null, "ar-EG")).toEqual({ lang: "en", dir: null });
		expect(run("/docs", "", null, "fa-IR")).toEqual({ lang: "en", dir: null });
	});

	it("applies a saved supported locale, rtl only for ar and fa", () => {
		expect(run("/docs/components", "", "ar")).toEqual({ lang: "ar", dir: "rtl" });
		expect(run("/docs/components", "", "fa")).toEqual({ lang: "fa", dir: "rtl" });
		expect(run("/docs/components", "", "fr")).toEqual({ lang: "fr", dir: "ltr" });
		expect(run("/docs/components", "", "zh-Hans")).toEqual({ lang: "zh-Hans", dir: "ltr" });
	});

	it("lets ?lang= win over the saved choice", () => {
		expect(run("/docs/components", "?lang=ar", "fr")).toEqual({ lang: "ar", dir: "rtl" });
		expect(run("/docs/components", "?lang=de", "ar")).toEqual({ lang: "de", dir: "ltr" });
	});

	it("ignores an unsupported or hostile value and falls back to the saved one", () => {
		expect(run("/docs/components", "?lang=xx", "ar")).toEqual({ lang: "ar", dir: "rtl" });
		expect(run("/docs/components", "?lang=constructor", null)).toEqual({ lang: "en", dir: null });
		expect(run("/docs/components", "?lang=__proto__", null)).toEqual({ lang: "en", dir: null });
		expect(run("/docs/components", "", "ar-EG")).toEqual({ lang: "en", dir: null });
		expect(run("/docs/components", "?lang=AR", null)).toEqual({ lang: "en", dir: null });
	});

	it("leaves routes outside /docs alone", () => {
		expect(run("/", "?lang=ar", "ar")).toEqual({ lang: "en", dir: null });
		expect(run("/inspiration", "", "fa")).toEqual({ lang: "en", dir: null });
	});
});
