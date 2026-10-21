import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { registry } from "$lib/fancy-ui/registry.js";
import { buildRegistry } from "./build.js";
import type { BuildInput } from "./build.js";
import { relativeSpecifiers, resolveSpecifier } from "./graph.js";
import { VUE_PATH_PREFIX, vueStack } from "./stacks/vue.js";

const SITE = "https://example.test";
const BASE = `${SITE}/r/vue`;

const meta = (slugs: string[]): BuildInput["meta"] =>
	Object.fromEntries(
		slugs.map((s) => [s, { name: `Name-${s}`, description: `About ${s}`, category: "effects" }])
	);

const build = (files: Record<string, string>, slugs = ["alpha", "beta"]) =>
	buildRegistry({ stack: vueStack, files, meta: meta(slugs), siteUrl: SITE });

const ALPHA = [
	'<script setup lang="ts">',
	'import { computed } from "vue";',
	'import type { HTMLAttributes } from "@vue/runtime-dom";',
	'import { useHead } from "#imports";',
	'import { navigateTo } from "#app";',
	'import { defineNuxtComponent } from "nuxt/app";',
	'import { cn } from "../../utils.js";',
	'import Part from "./Part.vue";',
	'import { tilt } from "./tilt.js";',
	'import type { BetaProps } from "../beta/types.js";',
	'import { ease } from "../../internals/motion/easing.js";',
	'import { useId } from "../../internals/use-id.js";',
	"</script>",
	"",
	"<template><div /></template>",
	"",
].join("\n");

const FIXTURE: Record<string, string> = {
	"index.ts": 'export * from "./components/alpha/index.js";\n',
	"test-setup.ts": 'import "@testing-library/jest-dom";\n',
	"ssr-hydration.test.ts": 'import { renderToString } from "vue/server-renderer";\n',
	"ssr-sweep.fixtures.ts": "export const fixtures = [];\n",
	"cameleon/context.ts": 'import { inject } from "vue";\n',
	"utils.ts":
		'import { clsx } from "clsx";\nimport { twMerge } from "tailwind-merge";\nexport const cn = () => "";\n',
	"components/alpha/Alpha.vue": ALPHA,
	"components/alpha/Part.vue":
		'<script setup lang="ts">\nimport { cn } from "../../utils.js";\n</script>\n',
	"components/alpha/tilt.ts": "export const tilt = 1;\n",
	"components/alpha/index.ts":
		'export { default as Alpha } from "./Alpha.vue";\nexport * from "./tilt.js";\n',
	"components/alpha/Alpha.test.ts": 'import { render } from "@testing-library/vue";\n',
	"components/alpha/README.md": "# Alpha\n",
	"components/beta/Beta.vue":
		'<script setup lang="ts">\nimport confetti from "canvas-confetti";\n</script>\n',
	"components/beta/types.ts": "export type BetaProps = {};\n",
	"internals/use-id.ts": 'import { useId as vueUseId } from "vue";\nexport const useId = 1;\n',
	"internals/StreamText.vue":
		'<script setup lang="ts">\nimport "./stream-text.css";\nimport { cn } from "../utils.js";\n</script>\n',
	"internals/stream-text.css": ".stream{}\n",
	"internals/use-id.test.ts": "export {};\n",
	"internals/dom/context.ts": 'import { inject, provide } from "vue";\nexport const c = 1;\n',
	"internals/motion/easing.ts": 'import { clamp } from "../use-id.js";\nexport const ease = 1;\n',
	"sound/engine.ts": "export const e = 1;\n",
	"sound/SoundToggle.vue":
		'<script setup lang="ts">\nimport "./sound-toggle.css";\nimport { e } from "./engine.js";\n</script>\n',
	"sound/sound-toggle.css": ".t{}\n",
	"sound/web-audio-mock.ts": "export const m = 1;\n",
	"sound/sound.ssr.test.ts": "export {};\n",
};

describe("vue stack helpers", () => {
	it("maps files to groups", () => {
		const g = vueStack.groupOf;
		expect(g("utils.ts")).toBe("utils");
		expect(g("internals/float.ts")).toBe("internals");
		expect(g("internals/Markdown.vue")).toBe("internals");
		expect(g("internals/markdown.css")).toBe("internals");
		expect(g("internals/dom/context.ts")).toBe("internals-dom");
		expect(g("internals/motion/easing.ts")).toBe("internals-motion");
		expect(g("sound/SoundToggle.vue")).toBe("sound");
		expect(g("components/rainbow-button/RainbowButton.vue")).toBe("rainbow-button");
		expect(g("index.ts")).toBeNull();
		expect(g("test-setup.ts")).toBeNull();
		expect(g("ssr-hydration.test.ts")).toBeNull();
		expect(g("ssr-sweep.fixtures.ts")).toBeNull();
		expect(g("cameleon/context.ts")).toBeNull();
		expect(g("internals/markdown/x.ts")).toBeNull();
	});

	it("excludes tests, fixtures, the test setup, the mock, READMEs and other kinds", () => {
		for (const p of [
			"components/alpha/Alpha.test.ts",
			"internals/elapsed.ssr.test.ts",
			"ssr-sweep.fixtures.ts",
			"test-setup.ts",
			"sound/web-audio-mock.ts",
			"components/alpha/README.md",
			"components/alpha/Alpha.tsx",
			"components/alpha/Alpha.svelte",
		]) {
			expect(vueStack.isExcluded(p) || !vueStack.isKeptKind(p), p).toBe(true);
		}
		expect(vueStack.isExcluded("components/alpha/Alpha.vue")).toBe(false);
		expect(vueStack.isExcluded("internals/stream-text.css")).toBe(false);
		expect(vueStack.isExcluded("sound/sound.svelte.ts")).toBe(false);
		expect(vueStack.isCode("internals/stream-text.css")).toBe(false);
		expect(vueStack.isCode("components/alpha/Alpha.vue")).toBe(true);
	});

	it("treats vue, vue/*, @vue/*, nuxt, #imports and #app as the framework", () => {
		for (const s of [
			"vue",
			"vue/server-renderer",
			"@vue/runtime-dom",
			"nuxt",
			"nuxt/app",
			"#imports",
			"#app",
		]) {
			expect(vueStack.isFrameworkPackage(s), s).toBe(true);
		}
		expect(vueStack.isFrameworkPackage("vue-router")).toBe(false);
		expect(vueStack.isFrameworkPackage("vueuse")).toBe(false);
		expect(vueStack.isFrameworkPackage("three")).toBe(false);
	});
});

describe("buildRegistry with the vue stack on fixtures", () => {
	const out = build(FIXTURE);

	it("emits one item per component folder and shared module", () => {
		expect(Object.keys(out.items)).toEqual([
			"alpha",
			"beta",
			"internals",
			"internals-dom",
			"internals-motion",
			"sound",
			"utils",
		]);
		expect(out.index.$schema).toBe("https://shadcn-vue.com/schema/registry.json");
		expect(out.items.alpha.$schema).toBe("https://shadcn-vue.com/schema/registry-item.json");
		expect(out.index.name).toBe("fancy-ui");
		expect(out.items.internals.title).toBe("Shared internals");
		expect(out.items.internals.description).toMatch(/markdown/);
	});

	it("ships every file as registry:ui under the steering path, with no target key", () => {
		expect(out.items.alpha.type).toBe("registry:ui");
		expect(out.items.alpha.files.map((f) => [f.path, f.type])).toEqual([
			["src/components/ui/fancy/components/alpha/Alpha.vue", "registry:ui"],
			["src/components/ui/fancy/components/alpha/Part.vue", "registry:ui"],
			["src/components/ui/fancy/components/alpha/index.ts", "registry:ui"],
			["src/components/ui/fancy/components/alpha/tilt.ts", "registry:ui"],
		]);
		for (const name of ["internals", "internals-dom", "internals-motion", "sound", "utils"]) {
			expect(out.items[name].type, name).toBe("registry:lib");
			for (const f of out.items[name].files) expect(f.type, f.path).toBe("registry:ui");
		}
		expect(out.items.utils.files.map((f) => f.path)).toEqual(["src/components/ui/fancy/utils.ts"]);
		expect(out.items.sound.files.map((f) => f.path)).toEqual([
			"src/components/ui/fancy/sound/SoundToggle.vue",
			"src/components/ui/fancy/sound/engine.ts",
			"src/components/ui/fancy/sound/sound-toggle.css",
		]);
		const files = [
			...Object.values(out.items).flatMap((i) => i.files),
			...out.index.items.flatMap((i) => i.files),
		];
		for (const f of files) expect(f).not.toHaveProperty("target");
		expect(JSON.stringify(out)).not.toContain('"target"');
	});

	it("keeps every source byte-identical (no directive, .js specifiers kept)", () => {
		const alpha = out.items.alpha.files[0].content as string;
		expect(alpha).toBe(ALPHA);
		expect(alpha).toContain('from "../../utils.js"');
		expect(alpha).not.toContain("use client");
		const css = out.items.internals.files.find((f) => f.path.endsWith("stream-text.css"));
		expect(css?.content).toBe(".stream{}\n");
	});

	it("follows .vue sibling, internals css, cross-component and shared edges as full URLs", () => {
		expect(out.items.alpha.registryDependencies).toEqual([
			`${BASE}/beta.json`,
			`${BASE}/internals.json`,
			`${BASE}/internals-motion.json`,
			`${BASE}/utils.json`,
		]);
		// The css side-effect import stays inside the item; StreamText.vue pulls utils only.
		expect(out.items.internals.files.map((f) => f.path)).toContain(
			"src/components/ui/fancy/internals/stream-text.css"
		);
		expect(out.items.internals.registryDependencies).toEqual([`${BASE}/utils.json`]);
		expect(out.items["internals-motion"].registryDependencies).toEqual([
			`${BASE}/internals.json`,
			`${BASE}/utils.json`,
		]);
		expect(out.items.sound.registryDependencies).toBeUndefined();
	});

	it("records npm packages but never the framework or aliases", () => {
		expect(out.items.alpha.dependencies).toBeUndefined();
		expect(out.items["internals-dom"].dependencies).toBeUndefined();
		expect(out.items.internals.dependencies).toBeUndefined();
		expect(out.items.utils.dependencies).toEqual(["clsx", "tailwind-merge"]);
		expect(out.items.beta.dependencies).toEqual(["canvas-confetti"]);
		expect(out.items.beta.devDependencies).toEqual(["@types/canvas-confetti"]);
		expect(out.items.beta.docs).toBe("Installs canvas-confetti as a dependency.");
	});

	it("ships no test, fixture, setup, mock, README, root or cameleon file", () => {
		const paths = Object.values(out.items).flatMap((i) => i.files.map((f) => f.path));
		for (const p of paths) {
			expect(p).not.toMatch(
				/\.test\.|fixtures|test-setup|web-audio-mock|README|cameleon\/|fancy\/index\.ts$/
			);
		}
		expect(paths).toHaveLength(15);
	});

	it("throws when a kept file imports an excluded file", () => {
		expect(() =>
			build({
				"components/alpha/Alpha.vue":
					'<script setup lang="ts">\nimport { m } from "../../sound/web-audio-mock.js";\n</script>\n',
				"sound/web-audio-mock.ts": "export const m = 1;\n",
			})
		).toThrow(/vue\/src\/components\/alpha\/Alpha\.vue imports .* excluded/);
	});

	it("throws on a missing .vue sibling, naming the file", () => {
		expect(() =>
			build({
				"components/alpha/Alpha.vue":
					'<script setup lang="ts">\nimport Part from "./Part.vue";\n</script>\n',
			})
		).toThrow(/unresolved import "\.\/Part\.vue" in vue\/src\/components\/alpha\/Alpha\.vue/);
	});

	it("throws on a component folder without metadata or colliding with a shared item", () => {
		expect(() => build({ "components/zeta/Zeta.vue": "<template />\n" })).toThrow(
			/vue\/src\/components\/zeta\/ has no entry/
		);
		expect(() => build({ "components/sound/X.vue": "<template />\n" }, ["sound"])).toThrow(
			/duplicate item name "sound"/
		);
	});
});

describe("buildRegistry with the vue stack on the real vue/src tree", () => {
	const root = `${resolve(process.cwd(), "vue/src")}/`;
	const files: Record<string, string> = {};
	for (const entry of readdirSync(root, { recursive: true }) as string[]) {
		const rel = entry.split("\\").join("/");
		if (/\.(vue|ts|css)$/.test(rel)) files[rel] = readFileSync(root + rel, "utf8");
	}
	const metaInput: BuildInput["meta"] = {};
	for (const [slug, entry] of Object.entries(registry)) {
		metaInput[slug] = {
			name: entry.name,
			description: entry.description,
			category: entry.category,
		};
	}
	const out = buildRegistry({
		stack: vueStack,
		files,
		meta: metaInput,
		siteUrl: "https://fancy-ui.rama.app",
	});
	const base = "https://fancy-ui.rama.app/r/vue";
	const all = Object.values(out.items).flatMap((i) => i.files);

	it("emits 151 items (146 components + 5 shared)", () => {
		expect(Object.keys(out.items)).toHaveLength(151);
		expect(out.index.items).toHaveLength(151);
		expect(Object.values(out.items).filter((i) => i.type === "registry:ui")).toHaveLength(146);
		expect(
			Object.values(out.items)
				.filter((i) => i.type === "registry:lib")
				.map((i) => i.name)
		).toEqual(["internals", "internals-dom", "internals-motion", "sound", "utils"]);
	});

	// Observed on 2026-10-21: 490 shipped files. The gate pins the exact number.
	it("ships 490 files, every one registry:ui under the steering path, no target", () => {
		expect(all).toHaveLength(490);
		for (const f of all) {
			expect(f.type, f.path).toBe("registry:ui");
			expect(f.path.startsWith(VUE_PATH_PREFIX), f.path).toBe(true);
			expect(f).not.toHaveProperty("target");
			expect(f.content, f.path).not.toMatch(/^\s*["']use client["']/);
		}
		expect(JSON.stringify(out)).not.toContain('"target"');
		for (const item of out.index.items) {
			for (const f of item.files) {
				expect(f).not.toHaveProperty("target");
				expect(f).not.toHaveProperty("content");
			}
		}
	});

	it("ships every source byte-identical", () => {
		for (const f of all) {
			expect(f.content, f.path).toBe(files[f.path.slice(VUE_PATH_PREFIX.length)]);
		}
	});

	it("ships no test, fixture, setup, mock, README, root barrel or cameleon file", () => {
		for (const f of all) {
			expect(f.path, f.path).not.toMatch(
				/\.test\.|\.fixtures\.|test-setup|web-audio-mock|README|cameleon\//
			);
		}
		expect(all.map((f) => f.path)).not.toContain(`${VUE_PATH_PREFIX}index.ts`);
	});

	it("resolves every relative import within the item or its registryDependencies", () => {
		const shipped = new Map<string, string>();
		for (const item of Object.values(out.items)) {
			for (const f of item.files) shipped.set(f.path.slice(VUE_PATH_PREFIX.length), item.name);
		}
		const known = new Set(shipped.keys());
		for (const item of Object.values(out.items)) {
			const reachable = new Set([
				item.name,
				...(item.registryDependencies ?? []).map((u) => u.slice(base.length + 1, -".json".length)),
			]);
			for (const f of item.files) {
				if (!vueStack.isCode(f.path)) continue;
				const rel = f.path.slice(VUE_PATH_PREFIX.length);
				for (const spec of relativeSpecifiers(f.content ?? "")) {
					const target = resolveSpecifier(rel, spec, known);
					expect(target, `${f.path} -> ${spec}`).not.toBeNull();
					expect(
						reachable.has(shipped.get(target as string) as string),
						`${f.path} -> ${spec}`
					).toBe(true);
				}
			}
		}
	});

	it("records the known cross-item edges and npm packages", () => {
		const deps = (name: string) => out.items[name].registryDependencies ?? [];
		const crossEdges: [string, string][] = [
			["alert-dialog", "button"],
			["alert-dialog", "dialog"],
			["artifact-card", "streaming-text"],
			["chat-message", "streaming-text"],
			["context-menu", "dropdown-menu"],
			["copy-button", "button"],
			["copy-button", "status-morph"],
			["form-field", "label"],
			["icon-button", "button"],
			["image-generation", "pixel-loader"],
			["inline-citation", "sources"],
			["recommendation-card", "number-ticker"],
		];
		for (const [from, to] of crossEdges) {
			expect(deps(from), `${from} -> ${to}`).toContain(`${base}/${to}.json`);
		}
		expect(deps("rainbow-button")).toContain(`${base}/utils.json`);
		expect(out.items.utils.dependencies).toEqual(["clsx", "tailwind-merge"]);
		expect(out.items.confetti.dependencies).toEqual(["canvas-confetti"]);
		expect(out.items.confetti.devDependencies).toEqual(["@types/canvas-confetti"]);
		expect(out.items["image-trail-cursor"].dependencies).toEqual(["gsap"]);
		const vuePkg = JSON.parse(readFileSync(resolve(process.cwd(), "vue/package.json"), "utf8"));
		const declared = new Set(Object.keys(vuePkg.dependencies ?? {}));
		const declaredDev = new Set([...declared, ...Object.keys(vuePkg.devDependencies ?? {})]);
		for (const item of Object.values(out.items)) {
			for (const dep of item.dependencies ?? []) {
				expect(dep, item.name).not.toMatch(/^(vue$|vue\/|@vue\/|nuxt|#)/);
				expect(declared.has(dep), `${item.name}: ${dep}`).toBe(true);
			}
			for (const dep of item.devDependencies ?? []) {
				expect(declaredDev.has(dep), `${item.name}: ${dep}`).toBe(true);
			}
			for (const url of item.registryDependencies ?? []) {
				expect(url.startsWith(`${base}/`), url).toBe(true);
				expect(out.items[url.slice(base.length + 1, -".json".length)], url).toBeDefined();
			}
		}
	});
});
