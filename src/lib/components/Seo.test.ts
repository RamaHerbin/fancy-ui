import { render, cleanup } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Seo from "./Seo.svelte";
import { setLocale } from "$lib/stores/locale.svelte.js";

const props = { title: "T", description: "D", path: "/docs" };
const meta = (sel: string) => document.head.querySelector(sel);

describe("Seo", () => {
	beforeEach(() => setLocale("en"));
	afterEach(() => {
		cleanup();
		setLocale("en");
	});

	it("emits og:locale en_US by default", () => {
		render(Seo, { props });
		expect(meta('meta[property="og:locale"]')?.getAttribute("content")).toBe("en_US");
	});

	it("og:locale follows the current locale", () => {
		setLocale("fr");
		render(Seo, { props });
		expect(meta('meta[property="og:locale"]')?.getAttribute("content")).toBe("fr_FR");
	});

	it("maps script-tagged locale codes", () => {
		setLocale("zh-Hans");
		render(Seo, { props });
		expect(meta('meta[property="og:locale"]')?.getAttribute("content")).toBe("zh_CN");
	});

	it("noindex drops the canonical link and adds robots", () => {
		render(Seo, { props: { ...props, noindex: true } });
		expect(meta('link[rel="canonical"]')).toBeNull();
		expect(meta('meta[name="robots"]')?.getAttribute("content")).toBe("noindex");
	});

	it("keeps the canonical link when indexable", () => {
		render(Seo, { props });
		expect(meta('link[rel="canonical"]')).not.toBeNull();
		expect(meta('meta[name="robots"]')).toBeNull();
	});

	it("never emits hreflang", () => {
		setLocale("de");
		render(Seo, { props });
		expect(meta("link[hreflang]")).toBeNull();
		expect(meta('link[rel="alternate"]')).toBeNull();
	});
});
