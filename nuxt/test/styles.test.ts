import { fileURLToPath } from "node:url";
import type { NuxtConfig } from "@nuxt/schema";
import { $fetch, createPage, setup } from "@nuxt/test-utils/e2e";
import { describe, expect, it } from "vitest";
import type { ModuleOptions } from "../src/types";

const fixture = (name: string) =>
	fileURLToPath(new URL(`./fixtures/styles/${name}`, import.meta.url));

/*
 * Each describe awaits setup(): it registers its beforeAll/afterAll hooks only
 * after an async import, so an un-awaited call would attach them outside the
 * describe and every block would share one context.
 */

/**
 * Markers of each stylesheet in the built CSS:
 * - BorderBeam's rider animation (`animation: bb-travel-<scope> var(--_dur)`)
 *   comes only from fancy-ui-vue/styles.css. It sits inside a
 *   prefers-reduced-motion media block, which the CSS minifier does NOT merge
 *   when the file is loaded twice — unlike a top-level @keyframes, which it
 *   collapses to one copy and would hide a double injection (verified: with
 *   the dedupe disabled, the manual-import build grows by ~78 KB while the
 *   keyframes count stays 1 and this marker counts 2);
 * - the `--primary:` token default and the `.bg-primary` rule come only from
 *   Tailwind compiling fancy-ui-vue/tailwind.css (its `@layer base` defaults,
 *   and `@theme inline` turning the probe's `bg-primary` class into a rule).
 *   styles.css merely reads `var(--color-primary, …)`, so the bare name is
 *   not a usable marker.
 */
/**
 * playwright-core resolves its own pinned Chromium build. When that build is
 * not downloaded locally, point CHROMIUM_EXECUTABLE at any installed Chromium.
 */
const browserOptions = {
	type: "chromium" as const,
	launch: process.env.CHROMIUM_EXECUTABLE
		? { executablePath: process.env.CHROMIUM_EXECUTABLE }
		: {},
};

const STYLES_MARKER = /animation:\s*bb-travel-[0-9a-f]+\s+var\(--_dur\)/g;
const TOKEN_MARKER = /--primary\s*:/;
const UTILITY_MARKER = /\.bg-primary\s*\{/;
const count = (css: string, re: RegExp) => css.match(re)?.length ?? 0;

/**
 * Every stylesheet the SSR'd page ships: inline <style> blocks plus each
 * linked /_nuxt/*.css, concatenated. Counting over all of them is what a
 * browser would load, so a double injection (inline + link, or two links)
 * shows up as a count of 2.
 */
async function pageCss(): Promise<{ css: string; links: string[] }> {
	const html = await $fetch<string>("/");
	const inline = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1] ?? "");
	const links = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)]
		.map((m) => /href="([^"]+)"/.exec(m[0])?.[1])
		.filter((href): href is string => !!href);
	const linked = await Promise.all(links.map((href) => $fetch<string>(href)));
	return { css: [...inline, ...linked].join("\n"), links };
}

interface BeamState {
	rootPosition: string;
	rootHeight: number;
	headPosition: string;
	animationName: string;
	maxDuration: number;
	probeBg: string;
}

/** Computed styles that prove which stylesheets reached the hydrated page. */
async function beamState(): Promise<BeamState> {
	const page = await createPage("/");
	await page.locator('[data-hydrated="true"]').waitFor({ state: "attached" });
	const state = await page.evaluate(() => {
		const root = document.querySelector<HTMLElement>(".border-beam");
		const head = root?.querySelector<HTMLElement>(".bb-head");
		const probe = document.querySelector<HTMLElement>("#tw-probe");
		if (!root || !head || !probe) return null;
		const cs = getComputedStyle(head);
		return {
			rootPosition: getComputedStyle(root).position,
			rootHeight: root.getBoundingClientRect().height,
			headPosition: cs.position,
			animationName: cs.animationName,
			maxDuration: Math.max(...cs.animationDuration.split(",").map((d) => parseFloat(d))),
			probeBg: getComputedStyle(probe).backgroundColor,
		};
	});
	await page.close();
	expect(state, "BorderBeam and the probe rendered").not.toBeNull();
	return state!;
}

describe("css: true with the documented Tailwind setup", async () => {
	await setup({
		rootDir: fixture("tailwind"),
		build: true,
		server: true,
		browser: true,
		browserOptions,
	});

	it("ships fancy-ui-vue/styles.css exactly once, after Tailwind", async () => {
		const { css, links } = await pageCss();
		expect(links.length).toBeGreaterThan(0);
		// the bare specifier resolved through the package exports — no
		// repo-relative path leaked into the HTML
		expect(links.join(" ")).not.toMatch(/\.\.\/|\/vue\/|@fs/);
		expect(count(css, STYLES_MARKER)).toBe(1);
		expect(css).toMatch(TOKEN_MARKER);
		expect(css).toMatch(UTILITY_MARKER);
		// documented order: tailwindcss, tailwind.css (main.css), then styles.css
		expect(css.search(UTILITY_MARKER)).toBeLessThan(css.search(STYLES_MARKER));
	});

	it("applies the stylesheet in the browser", async () => {
		const s = await beamState();
		expect(s.headPosition).toBe("absolute");
		expect(s.animationName).not.toBe("none");
		expect(s.maxDuration).toBeGreaterThan(0);
		expect(s.rootPosition).toBe("absolute");
		expect(s.rootHeight).toBe(180);
		expect(s.probeBg).not.toBe("rgba(0, 0, 0, 0)");
	});
});

describe("css: false", async () => {
	// Cast: the `fancyUi` key is only known to NuxtConfig once the built
	// module's type augmentation exists; `satisfies` still checks the options.
	const cssOff = { fancyUi: { css: false } satisfies Partial<ModuleOptions> } as NuxtConfig;
	await setup({ rootDir: fixture("tailwind"), build: true, server: true, nuxtConfig: cssOff });

	it("does not add fancy-ui-vue/styles.css; Tailwind is untouched", async () => {
		const { css } = await pageCss();
		expect(count(css, STYLES_MARKER)).toBe(0);
		expect(css).toMatch(TOKEN_MARKER);
	});
});

describe("css: true when main.css already imports styles.css", async () => {
	await setup({ rootDir: fixture("manual-import"), build: true, server: true });

	it("does not inject it a second time", async () => {
		const { css } = await pageCss();
		expect(count(css, STYLES_MARKER)).toBe(1);
	});
});

/**
 * What styles.css does on its own, with no Tailwind in the app. The scoped
 * component CSS (keyframes, positioning of the internals) applies, but every
 * Tailwind utility a component carries in its template (here BorderBeam's
 * root `absolute inset-0 rounded-[inherit] pointer-events-none`) is inert:
 * BorderBeam's root stays static and, being a size container, collapses to
 * zero height, so the beam is not visible. Tailwind is required.
 */
describe("css: true without Tailwind", async () => {
	await setup({
		rootDir: fixture("no-tailwind"),
		build: true,
		server: true,
		browser: true,
		browserOptions,
	});

	it("ships the scoped CSS but not the Tailwind utilities", async () => {
		const { css } = await pageCss();
		expect(count(css, STYLES_MARKER)).toBe(1);
		expect(css).not.toMatch(TOKEN_MARKER);
		expect(css).not.toMatch(UTILITY_MARKER);
	});

	it("leaves BorderBeam collapsed: its layout comes from Tailwind utilities", async () => {
		const s = await beamState();
		expect(s.headPosition).toBe("absolute");
		expect(s.maxDuration).toBeGreaterThan(0);
		expect(s.rootPosition).toBe("static");
		expect(s.rootHeight).toBe(0);
		expect(s.probeBg).toBe("rgba(0, 0, 0, 0)");
	});
});
