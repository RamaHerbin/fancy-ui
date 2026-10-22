import { fileURLToPath } from "node:url";
import { loadNuxt, logger } from "@nuxt/kit";
import type { Nuxt, NuxtConfig } from "@nuxt/schema";
import { $fetch, setup } from "@nuxt/test-utils/e2e";
import { afterEach, describe, expect, it } from "vitest";
import type { ModuleOptions } from "../src/types";

const rootDir = fileURLToPath(new URL("./fixtures/options", import.meta.url));
const COMPOSABLES = [
	"useSound",
	"useSoundCue",
	"useSoundEnabled",
	"useSoundStatus",
	"useSoundFeedback",
];

interface Registered {
	css: string[];
	imports: { name: string; as?: string; from: string }[];
	components: { pascalName: string; export?: string; filePath: string; priority?: number }[];
	optimizeDepsInclude: string[];
	warnings: string[];
}

let nuxt: Nuxt | undefined;
afterEach(async () => {
	await nuxt?.close();
	nuxt = undefined;
});

/**
 * Boots Nuxt with the module installed (no build) and replays the hooks the
 * module registers into, so each assertion sees exactly what the options
 * produced — not what Nuxt's own scanners add on top.
 */
async function register(
	fancyUi: Partial<ModuleOptions> = {},
	nuxtConfig: NuxtConfig = {}
): Promise<Registered> {
	const warnings: string[] = [];
	// useLogger() children share the root reporters array, so a reporter added
	// here sees the module's tagged warnings.
	const reporter = {
		log: (entry: { type: string; tag?: string; args: unknown[] }) => {
			if (entry.type === "warn" && entry.tag === "fancy-ui-nuxt")
				warnings.push(entry.args.join(" "));
		},
	};
	logger.addReporter(reporter);
	try {
		// The cast: `fancyUi` is typed by the built module's schema augmentation,
		// which does not exist when testing from source.
		nuxt = await loadNuxt({
			cwd: rootDir,
			dev: false,
			ready: true,
			overrides: { ...nuxtConfig, fancyUi } as NuxtConfig,
		});
	} finally {
		logger.removeReporter(reporter);
	}

	const imports: Registered["imports"] = [];
	await nuxt.callHook("imports:extend", imports as never);
	const components: Registered["components"] = [];
	await nuxt.callHook("components:extend", components as never);
	const config: { optimizeDeps?: { include?: string[] } } = {};
	await nuxt.callHook("vite:extend", { nuxt, config } as never);

	return {
		css: nuxt.options.css,
		imports,
		// Nuxt's own built-ins (NuxtLink, Html, …) arrive through the same hook.
		components: components.filter((c) => c.filePath.includes("/fancy-ui/components/")),
		optimizeDepsInclude: config.optimizeDeps?.include ?? [],
		warnings,
	};
}

describe("module options", () => {
	it("defaults: styles, every component under the Fancy prefix, the sound composables", async () => {
		const r = await register();

		expect(r.css).toContain("fancy-ui-vue/styles.css");
		expect(
			r.imports
				.filter((i) => i.from === "fancy-ui-vue")
				.map((i) => i.name)
				.sort()
		).toEqual([...COMPOSABLES].sort());
		expect(r.optimizeDepsInclude).toEqual(["fancy-ui-vue"]);

		const shimmer = r.components.find((c) => c.pascalName === "FancyShimmerButton");
		expect(shimmer?.export).toBe("default");
		expect(shimmer?.filePath).toMatch(/fancy-ui\/components\/ShimmerButton\.mjs$/);
		expect(r.components.every((c) => c.pascalName.startsWith("Fancy"))).toBe(true);
		expect(r.components.length).toBeGreaterThan(100);
		expect(r.warnings).toEqual([]);
	});

	it("composables: false registers no auto-import", async () => {
		const r = await register({ composables: false });
		expect(r.imports.filter((i) => i.from === "fancy-ui-vue")).toEqual([]);
	});

	it("css: false leaves nuxt.options.css untouched", async () => {
		const r = await register({ css: false });
		expect(r.css).not.toContain("fancy-ui-vue/styles.css");
	});

	it("css: true does not add styles.css again when nuxt.config already lists it", async () => {
		const r = await register({}, { css: ["fancy-ui-vue/styles.css"] });
		expect(r.css.filter((c) => c.includes("fancy-ui-vue/styles.css"))).toEqual([
			"fancy-ui-vue/styles.css",
		]);
	});

	it('prefix: "" registers the bare export names', async () => {
		const r = await register({ prefix: "", components: ["ShimmerButton"] });
		expect(r.components.map((c) => c.pascalName)).toEqual(["ShimmerButton"]);
	});

	it('prefix: "" leaves clashing names to the app and Nuxt built-ins, and says so for <Link>', async () => {
		const r = await register({ prefix: "", components: ["Link", "Button"] });
		const ours = r.components.filter((c) => c.filePath.includes("fancy-ui/components/"));
		expect(ours.every((c) => c.priority === -1)).toBe(true);
		expect(r.warnings.some((w) => w.includes("<Link>"))).toBe(true);
	});

	it("an invalid prefix warns and falls back to Fancy", async () => {
		const r = await register({ prefix: "my-ui", components: ["ShimmerButton"] });
		expect(r.components.map((c) => c.pascalName)).toEqual(["FancyShimmerButton"]);
		expect(r.warnings.some((w) => w.includes("fancyUi.prefix"))).toBe(true);
	});

	it("components: [names] registers only those once, warning on unknown ones", async () => {
		const r = await register({
			components: ["ShimmerButton", "NotAComponent", "ShimmerButton"],
		});
		expect(r.components.map((c) => c.pascalName)).toEqual(["FancyShimmerButton"]);
		expect(r.warnings.some((w) => w.includes("NotAComponent"))).toBe(true);
	});

	it("components: false registers none", async () => {
		const r = await register({ components: false });
		expect(r.components).toEqual([]);
	});
});

describe("composable auto-import (SSR)", async () => {
	await setup({ rootDir, build: true, server: true });

	it("renders a page that calls useSoundEnabled() without importing it", async () => {
		const html = await $fetch<string>("/");
		// Sound hydrates in onMounted, so the server always renders it off.
		expect(html).toContain("sound-enabled:false");
	});
});
