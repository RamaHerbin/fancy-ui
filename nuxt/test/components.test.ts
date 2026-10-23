import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { $fetch, setup, useTestContext } from "@nuxt/test-utils/e2e";
import { describe, expect, it } from "vitest";
import { components as manifest } from "../src/manifest";

await setup({
	rootDir: fileURLToPath(new URL("./fixtures/components", import.meta.url)),
	build: true,
	server: true,
});

function buildDir(): string {
	const nuxt = useTestContext().nuxt;
	if (!nuxt) throw new Error("no Nuxt instance in test context");
	return nuxt.options.buildDir;
}

async function clientChunks(): Promise<string> {
	// @nuxt/test-utils points nitro.output.dir at `<buildDir>/output` for builds.
	const dir = join(
		buildDir(),
		"output",
		"public",
		useTestContext().nuxt!.options.app.buildAssetsDir
	);
	const files = (await readdir(dir)).filter((f) => f.endsWith(".js"));
	expect(files.length).toBeGreaterThan(0);
	return (await Promise.all(files.map((f) => readFile(join(dir, f), "utf8")))).join("\n");
}

/**
 * Every SFC compiled by Vue carries an `__name: "<Component>"` literal that
 * survives minification (the minifier may switch the quotes to backticks).
 * Collecting them lists the components that actually reached the browser.
 */
function shippedComponents(code: string): string[] {
	const names = new Set<string>();
	for (const m of code.matchAll(/__name:\s*["'`]([A-Za-z0-9]+)["'`]/g)) names.add(m[1]!);
	return [...names].filter((n) => (manifest as readonly string[]).includes(n)).sort();
}

describe("component registration", () => {
	it("SSR-renders prefixed, lazy and kebab-case usages", async () => {
		const html = await $fetch<string>("/");
		// <FancyShimmerButton>: a real <button> with its layered faces.
		expect(html).toMatch(/<button[^>]*data-testid="shimmer"/);
		expect(html).toContain("shimmer-button__face");
		// <LazyFancyBorderBeam>: async wrapper still renders on the server.
		expect(html).toContain("border-beam");
		expect(html).toContain("bb-ring");
		// <fancy-badge>: kebab-case resolves to FancyBadge (<span> root).
		expect(html).toMatch(/<span[^>]*data-testid="kebab-badge"[^>]*>(<!--\[-->)?Kebab/);
	});

	it("writes one re-export shim (+ type twin) per component", async () => {
		const dir = join(buildDir(), "fancy-ui/components");
		const shim = await readFile(join(dir, "ShimmerButton.mjs"), "utf8");
		expect(shim.trim()).toBe('export { ShimmerButton as default } from "fancy-ui-vue";');
		expect(existsSync(join(dir, "ShimmerButton.d.ts"))).toBe(true);
		const files = await readdir(dir);
		expect(files.filter((f) => f.endsWith(".mjs"))).toHaveLength(manifest.length);
		expect(files.some((f) => /\.(client|server)\./.test(f))).toBe(false);
	});

	it("types components through the shims in components.d.ts", async () => {
		const dts = await readFile(join(buildDir(), "components.d.ts"), "utf8");
		expect(dts).toMatch(
			/export const FancyShimmerButton: typeof import\("#build\/fancy-ui\/components\/ShimmerButton"\)\['default'\]/
		);
		expect(dts).toMatch(/export const LazyFancyBorderBeam: LazyComponent</);
	});

	it("tree-shakes: client chunks carry used components only", async () => {
		const code = await clientChunks();
		const shipped = shippedComponents(code);
		// Used on the page.
		expect(shipped).toEqual(expect.arrayContaining(["ShimmerButton", "BorderBeam", "Badge"]));
		// Not used: must not reach the browser.
		expect(shipped).not.toContain("FluidCursor");
		expect(shipped).not.toContain("NoiseReveal");
		expect(code).not.toContain("WebGLRenderer");
		// Whole-barrel regression guard: a handful at most, never the library.
		expect(shipped.length).toBeLessThan(10);
		console.info(
			`[tree-shaking] ${shipped.length}/${manifest.length} components in client chunks: ${shipped.join(", ")}`
		);
	});
});
