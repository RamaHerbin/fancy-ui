import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { registry } from "$lib/fancy-ui/registry.js";
import { buildRegistry } from "./build.js";
import type { BuildInput } from "./build.js";
import {
	serverModulesFrom,
	closure,
	npmDependencies,
	relativeSpecifiers,
	resolveSpecifier,
	rewriteSpecifiers,
	stripJsExtensions,
} from "./graph.js";
import { groupOf, isExcluded, reactStack } from "./stacks/react.js";

const isReact = reactStack.isFrameworkPackage;

const SITE = "https://example.test";
const BASE = `${SITE}/r`;

const meta = (slugs: string[]): BuildInput["meta"] =>
	Object.fromEntries(
		slugs.map((s) => [s, { name: `Name-${s}`, description: `About ${s}`, category: "effects" }])
	);

const build = (files: Record<string, string>, extra: Partial<BuildInput> = {}) =>
	buildRegistry({
		stack: reactStack,
		files,
		meta: meta(["alpha", "beta", "gamma", "delta"]),
		siteUrl: SITE,
		serverModules: new Set(["utils.js"]),
		...extra,
	});

const UTILS =
	'import { clsx } from "clsx";\nimport { twMerge } from "tailwind-merge";\nexport const cn = () => "";\n';

describe("graph helpers", () => {
	it("reads relative specifiers from imports, re-exports and side-effect imports only", () => {
		const code = [
			"/**",
			' * import { nope } from "./doc-comment.js";',
			" */",
			'import { a } from "./a.js";',
			'import type { B } from "../b/types.js";',
			"import {",
			"\tc,",
			"\ttype D,",
			'} from "../../c.js";',
			'import "./x.css";',
			'export { e } from "./e.js";',
			'export type { F } from "./f.js";',
			'export * from "./g.js";',
			'import React from "react";',
			'import gsap from "gsap";',
		].join("\n");
		expect(relativeSpecifiers(code)).toEqual(
			["../../c.js", "../b/types.js", "./a.js", "./e.js", "./f.js", "./g.js", "./x.css"].sort()
		);
		expect(npmDependencies(code, isReact)).toEqual(["gsap"]);
	});

	it("reduces npm specifiers to package names and skips the react family", () => {
		const code =
			'import a from "three/examples/jsm/x.js";\nimport b from "@scope/pkg/sub";\nimport "react-dom/client";\nimport { jsx } from "react/jsx-runtime";\n';
		expect(npmDependencies(code, isReact)).toEqual(["@scope/pkg", "three"]);
	});

	it("resolves .js to .ts/.tsx, keeps .css literal, and tries directory indexes", () => {
		const known = new Set([
			"utils.ts",
			"components/a/A.tsx",
			"components/a/a.css",
			"components/b/index.ts",
		]);
		expect(resolveSpecifier("components/a/A.tsx", "../../utils.js", known)).toBe("utils.ts");
		expect(resolveSpecifier("components/a/index.ts", "./A.js", known)).toBe("components/a/A.tsx");
		expect(resolveSpecifier("components/a/A.tsx", "./a.css", known)).toBe("components/a/a.css");
		expect(resolveSpecifier("components/a/A.tsx", "../b", known)).toBe("components/b/index.ts");
		expect(resolveSpecifier("components/a/A.tsx", "./missing.js", known)).toBeNull();
		const svelte = new Set(["a/A.svelte", "a/x.svelte.ts", "m/media-query.svelte.ts"]);
		expect(resolveSpecifier("a/index.ts", "./A.svelte", svelte)).toBe("a/A.svelte");
		expect(resolveSpecifier("a/A.svelte", "./x.svelte.js", svelte)).toBe("a/x.svelte.ts");
		expect(resolveSpecifier("a/A.svelte", "../m/media-query.svelte", svelte)).toBe(
			"m/media-query.svelte.ts"
		);
		expect(resolveSpecifier("utils.ts", "../../outside.js", known)).toBeNull();
	});

	it("maps files to groups", () => {
		expect(groupOf("utils.ts")).toBe("utils");
		expect(groupOf("internals/Portal.tsx")).toBe("internals");
		expect(groupOf("internals/dom/ssr.ts")).toBe("internals-dom");
		expect(groupOf("internals/motion/easing.ts")).toBe("internals-motion");
		expect(groupOf("internals/markdown/markdown.css")).toBe("internals-markdown");
		expect(groupOf("sound/engine.ts")).toBe("sound");
		expect(groupOf("components/rainbow-button/RainbowButton.tsx")).toBe("rainbow-button");
		expect(groupOf("index.ts")).toBeNull();
		expect(groupOf("cameleon/index.ts")).toBeNull();
	});

	it("excludes tests, harnesses, the audio mock and READMEs", () => {
		for (const p of [
			"components/a/A.test.tsx",
			"components/a/A.ssr.test.tsx",
			"components/a/A.memo.test.tsx",
			"internals/x.test.ts",
			"components/a/AHarness.tsx",
			"components/a/IntegrationHarness.tsx",
			"components/a/README.md",
			"sound/web-audio-mock.ts",
		]) {
			expect(isExcluded(p), p).toBe(true);
		}
		expect(isExcluded("components/a/A.tsx")).toBe(false);
		expect(isExcluded("components/a/a.css")).toBe(false);
	});

	it("computes a sorted transitive closure", () => {
		const edges = new Map([
			["a", ["b"]],
			["b", ["c", "a"]],
		]);
		expect(closure(["a"], edges)).toEqual(["a", "b", "c"]);
	});

	it("rewrites specifiers through a function, keeping the rest byte for byte", () => {
		const code =
			' * import { doc } from "$lib/utils.js";\nimport { cn } from \'$lib/utils.js\';\nexport { a } from "./a.js";\nconst m = import("./m.js");\n';
		expect(rewriteSpecifiers(code, (s) => (s === "$lib/utils.js" ? "$UTILS$.js" : s))).toBe(
			' * import { doc } from "$lib/utils.js";\nimport { cn } from \'$UTILS$.js\';\nexport { a } from "./a.js";\nconst m = import("./m.js");\n'
		);
		expect(stripJsExtensions(code)).toBe(
			' * import { doc } from "$lib/utils.js";\nimport { cn } from \'$lib/utils.js\';\nexport { a } from "./a";\nconst m = import("./m");\n'
		);
	});

	it("never records alias or placeholder specifiers as npm packages", () => {
		const code =
			'import { cn } from "$UTILS$.js";\nimport { goto } from "$app/navigation";\nimport x from "#imports";\nimport y from "pkg";\n';
		expect(npmDependencies(code, () => false)).toEqual(["pkg"]);
	});
});

describe("buildRegistry on fixtures", () => {
	it("ships a simple component with its css, directive and utils dependency", () => {
		const out = build({
			"utils.ts": UTILS,
			"components/alpha/Alpha.tsx": 'import { cn } from "../../utils.js";\nimport "./alpha.css";\n',
			"components/alpha/alpha.css": ".a{}\n",
			"components/alpha/index.ts": 'export { Alpha } from "./Alpha.js";\n',
		});
		const item = out.items.alpha;
		expect(item.$schema).toBe("https://ui.shadcn.com/schema/registry-item.json");
		expect(item).toMatchObject({
			name: "alpha",
			type: "registry:ui",
			title: "Name-alpha",
			description: "About alpha",
			categories: ["effects"],
			registryDependencies: [`${BASE}/utils.json`],
		});
		expect(item.dependencies).toBeUndefined();
		expect(item.docs).toBeUndefined();
		expect(item.files.map((f) => f.path)).toEqual([
			"react/src/components/alpha/Alpha.tsx",
			"react/src/components/alpha/alpha.css",
			"react/src/components/alpha/index.ts",
		]);
		const [tsx, css] = item.files;
		expect(tsx.target).toBe("@ui/fancy/components/alpha/Alpha.tsx");
		expect(tsx.type).toBe("registry:ui");
		expect(tsx.content?.startsWith('"use client";\n\nimport { cn }')).toBe(true);
		expect(css.content).toBe(".a{}\n");

		const utils = out.items.utils;
		expect(utils.type).toBe("registry:lib");
		expect(utils.dependencies).toEqual(["clsx", "tailwind-merge"]);
		expect(utils.categories).toBeUndefined();
		expect(utils.registryDependencies).toBeUndefined();
		expect(utils.files[0]).toMatchObject({ target: "@ui/fancy/utils.ts", type: "registry:lib" });
		// server module: no directive
		expect(utils.files[0].content).toBe(UTILS);
	});

	it("follows whole groups: a dependency on one file pulls in what the group needs", () => {
		const out = build({
			"utils.ts": UTILS,
			"sound/use-sound.ts": "export const u = 1;\n",
			"sound/Toggle.tsx": 'import { cn } from "../utils.js";\n',
			"components/alpha/Alpha.tsx": 'import { u } from "../../sound/use-sound.js";\n',
		});
		expect(out.items.alpha.registryDependencies).toEqual([
			`${BASE}/sound.json`,
			`${BASE}/utils.json`,
		]);
	});

	it("lists a sibling component reached through a deep file", () => {
		const out = build({
			"components/beta/types.ts": "export type T = 1;\n",
			"components/alpha/Alpha.tsx": 'import type { T } from "../beta/types.js";\n',
		});
		expect(out.items.alpha.registryDependencies).toEqual([`${BASE}/beta.json`]);
		expect(out.items.alpha.files).toHaveLength(1);
	});

	it("records npm dependencies with a docs sentence", () => {
		const out = build({
			"components/alpha/Alpha.tsx":
				'import confetti from "canvas-confetti";\nimport { useState } from "react";\n',
			"components/beta/Beta.tsx": 'import * as THREE from "three";\nimport { gsap } from "gsap";\n',
		});
		expect(out.items.alpha.dependencies).toEqual(["canvas-confetti"]);
		expect(out.items.alpha.docs).toBe("Installs canvas-confetti as a dependency.");
		expect(out.items.alpha.devDependencies).toEqual(["@types/canvas-confetti"]);
		expect(out.items.beta.dependencies).toEqual(["gsap", "three"]);
		expect(out.items.beta.docs).toBe("Installs gsap and three as dependencies.");
	});

	it("reaches an internal with css transitively", () => {
		const out = build({
			"utils.ts": UTILS,
			"internals/Stream.tsx":
				'import { cn } from "../utils.js";\nimport { x } from "./markdown/Md.js";\nimport "./stream.css";\n',
			"internals/stream.css": ".s{}\n",
			"internals/markdown/Md.tsx": "export const x = 1;\n",
			"internals/markdown/markdown.css": ".m{}\n",
			"components/alpha/Alpha.tsx": 'import { Stream } from "../../internals/Stream.js";\n',
		});
		expect(out.items.alpha.registryDependencies).toEqual([
			`${BASE}/internals.json`,
			`${BASE}/internals-markdown.json`,
			`${BASE}/utils.json`,
		]);
		expect(out.items.internals.files.map((f) => f.target)).toEqual([
			"@ui/fancy/internals/Stream.tsx",
			"@ui/fancy/internals/stream.css",
		]);
		expect(out.items["internals-markdown"].files.map((f) => f.target)).toEqual([
			"@ui/fancy/internals/markdown/Md.tsx",
			"@ui/fancy/internals/markdown/markdown.css",
		]);
		expect(out.items.internals.title).toBe("Shared internals");
	});

	it("ignores excluded files and keeps dev.ts only when imported", () => {
		const out = build({
			"components/alpha/Alpha.tsx": 'import { isDev } from "./dev.js";\n',
			"components/alpha/dev.ts": "export const isDev = () => false;\n",
			"components/alpha/Alpha.test.tsx": 'import { x } from "./AlphaHarness.js";\n',
			"components/alpha/AlphaHarness.tsx": 'import { y } from "./nowhere.js";\n',
			"components/alpha/README.md": "# Alpha\n",
			"components/beta/Beta.tsx": "export const b = 1;\n",
			"components/beta/dev.ts": "export const isDev = () => false;\n",
			"sound/engine.ts": "export const e = 1;\n",
			"sound/web-audio-mock.ts": "export const m = 1;\n",
			"index.ts": 'export * from "./nowhere.js";\n',
		});
		expect(out.items.alpha.files.map((f) => f.path)).toEqual([
			"react/src/components/alpha/Alpha.tsx",
			"react/src/components/alpha/dev.ts",
		]);
		expect(out.items.beta.files.map((f) => f.path)).toEqual(["react/src/components/beta/Beta.tsx"]);
		expect(out.items.sound.files.map((f) => f.path)).toEqual(["react/src/sound/engine.ts"]);
	});

	it("applies the directive to client modules only", () => {
		const out = build(
			{
				"components/alpha/Alpha.tsx": "export const A = 1;\n",
				"components/alpha/index.ts": "export const MAP = {};\n",
				"components/beta/Beta.tsx": '"use client";\n\nexport const B = 1;\n',
			},
			{ serverModules: new Set(["components/alpha/index.js"]) }
		);
		const [tsx, idx] = out.items.alpha.files;
		expect(tsx.content).toBe('"use client";\n\nexport const A = 1;\n');
		expect(idx.content).toBe("export const MAP = {};\n");
		expect(out.items.beta.files[0].content).toBe('"use client";\n\nexport const B = 1;\n');
	});

	it("builds an index without content, sorted, with the schema header", () => {
		const out = build({
			"utils.ts": UTILS,
			"components/beta/Beta.tsx": 'import { cn } from "../../utils.js";\n',
			"components/alpha/Alpha.tsx": "export const A = 1;\n",
		});
		expect(out.index.$schema).toBe("https://ui.shadcn.com/schema/registry.json");
		expect(out.index.name).toBe("fancy-ui");
		expect(out.index.homepage).toBe(SITE);
		expect(out.index.items.map((i) => i.name)).toEqual(["alpha", "beta", "utils"]);
		expect(Object.keys(out.items)).toEqual(["alpha", "beta", "utils"]);
		for (const item of out.index.items) {
			expect(item.$schema).toBeUndefined();
			for (const f of item.files) expect(f).not.toHaveProperty("content");
		}
		// the items keep their content
		expect(out.items.beta.files[0].content).toContain("cn");
	});

	it("strips the .js extension from relative specifiers when asked", () => {
		const src =
			'import { cn } from "../../utils.js";\nimport "./alpha.css";\nexport { A } from "./Alpha.js";\nimport x from "pkg/file.js";\n';
		const out = build(
			{
				"utils.ts": UTILS,
				"components/alpha/Alpha.tsx": "export const A = 1;\n",
				"components/alpha/alpha.css": "",
				"components/alpha/index.ts": src,
			},
			{ stripJsExtension: true }
		);
		const index = out.items.alpha.files.find((f) => f.path.endsWith("index.ts"));
		expect(index?.content).toBe(
			'"use client";\n\nimport { cn } from "../../utils";\nimport "./alpha.css";\nexport { A } from "./Alpha";\nimport x from "pkg/file.js";\n'
		);
	});

	it("throws on an unresolved import, naming the file", () => {
		expect(() =>
			build({ "components/alpha/Alpha.tsx": 'import { x } from "./missing.js";\n' })
		).toThrow(/unresolved import "\.\/missing\.js" in react\/src\/components\/alpha\/Alpha\.tsx/);
	});

	it("throws when a kept file imports an excluded file", () => {
		expect(() =>
			build({
				"components/alpha/Alpha.tsx": 'import { h } from "./AlphaHarness.js";\n',
				"components/alpha/AlphaHarness.tsx": "export const h = 1;\n",
			})
		).toThrow(/excluded/);
		expect(() =>
			build({
				"components/alpha/Alpha.tsx": 'import { t } from "./Alpha.test.js";\n',
				"components/alpha/Alpha.test.tsx": "export const t = 1;\n",
			})
		).toThrow(/excluded/);
	});

	it("throws when a kept file imports a file outside every item", () => {
		expect(() =>
			build({
				"components/alpha/Alpha.tsx": 'import { s } from "../../cameleon/context.js";\n',
				"cameleon/context.ts": "export const s = 1;\n",
			})
		).toThrow(/react\/src\/cameleon\/context\.ts\), which belongs to no registry item/);
	});

	it("throws when a component folder has no metadata", () => {
		expect(() => build({ "components/zeta/Zeta.tsx": "export const Z = 1;\n" })).toThrow(
			/components\/zeta\/ has no entry/
		);
	});

	it("throws on a component name that collides with a shared item", () => {
		expect(() =>
			build({ "components/sound/Sound.tsx": "export const S = 1;\n" }, { meta: meta(["sound"]) })
		).toThrow(/duplicate item name "sound"/);
	});
});

describe("buildRegistry on the real react/src tree", () => {
	// jsdom gives import.meta.url a non-file scheme; vitest runs from the repo root.
	const root = `${resolve(process.cwd(), "react/src")}/`;
	const files: Record<string, string> = {};
	for (const entry of readdirSync(root, { recursive: true }) as string[]) {
		const rel = entry.split("\\").join("/");
		const inGlob =
			rel === "utils.ts" ||
			(/^(components|internals|sound)\//.test(rel) && /\.(ts|tsx|css)$/.test(rel));
		if (inGlob) files[rel] = readFileSync(root + rel, "utf8");
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
		stack: reactStack,
		files,
		meta: metaInput,
		siteUrl: "https://fancy-ui.rama.app",
		serverModules: serverModulesFrom(
			readFileSync(resolve(process.cwd(), "react/scripts/client-boundary.mjs"), "utf8")
		),
	});
	const base = "https://fancy-ui.rama.app/r";

	it('leaves no relative ".js" specifier once stripJsExtension is on (the site\'s setting)', () => {
		const stripped = buildRegistry({
			stack: reactStack,
			files,
			meta: metaInput,
			siteUrl: "https://fancy-ui.rama.app",
			serverModules: serverModulesFrom(
				readFileSync(resolve(process.cwd(), "react/scripts/client-boundary.mjs"), "utf8")
			),
			stripJsExtension: true,
		});
		const offenders: string[] = [];
		for (const item of Object.values(stripped.items)) {
			for (const file of item.files) {
				for (const spec of relativeSpecifiers(file.content ?? "")) {
					if (spec.endsWith(".js")) offenders.push(`${file.path}: ${spec}`);
				}
			}
		}
		expect(offenders).toEqual([]);
		// CSS side-effect imports are untouched.
		const rb = stripped.items["rainbow-button"].files.find((f) =>
			f.path.endsWith("RainbowButton.tsx")
		);
		expect(rb?.content).toContain('import "./rainbow-button.css";');
		expect(rb?.content).toContain('from "../../utils"');
	});

	it("emits 160 items (154 components + 6 shared)", () => {
		expect(Object.keys(out.items)).toHaveLength(160);
		expect(out.index.items).toHaveLength(160);
		const shared = Object.values(out.items).filter((i) => i.type === "registry:lib");
		expect(shared.map((i) => i.name)).toEqual([
			"internals",
			"internals-dom",
			"internals-markdown",
			"internals-motion",
			"sound",
			"utils",
		]);
	});

	it("targets every component file under its own folder", () => {
		for (const item of Object.values(out.items)) {
			if (item.type !== "registry:ui") continue;
			for (const f of item.files) {
				expect(f.target?.startsWith(`@ui/fancy/components/${item.name}/`), f.target).toBe(true);
			}
		}
	});

	it("keeps every file's type equal to its item's, its path under react/src and its target under @ui/fancy", () => {
		for (const item of Object.values(out.items)) {
			for (const f of item.files) {
				expect(f.type).toBe(item.type);
				expect(f.target).toBe(`@ui/fancy/${f.path.slice("react/src/".length)}`);
			}
		}
		expect(out.index.$schema).toBe("https://ui.shadcn.com/schema/registry.json");
	});

	it('prepends "use client" to client modules only', () => {
		const boundary = serverModulesFrom(
			readFileSync(resolve(process.cwd(), "react/scripts/client-boundary.mjs"), "utf8")
		);
		let client = 0;
		for (const item of Object.values(out.items)) {
			for (const f of item.files) {
				if (!/\.tsx?$/.test(f.path)) {
					expect(f.content).not.toMatch(/^"use client";/);
					continue;
				}
				const rel = f.path.slice("react/src/".length).replace(/\.tsx?$/, ".js");
				const hasDirective = /^\s*["']use client["'];?/.test(f.content ?? "");
				if (boundary.has(rel)) expect(f.content?.startsWith('"use client";\n\n'), rel).toBe(false);
				else {
					expect(hasDirective, rel).toBe(true);
					client++;
				}
			}
		}
		expect(client).toBeGreaterThan(0);
		expect(out.items.utils.files[0].content).not.toContain("use client");
	});

	it("records the known cross-item edges", () => {
		expect(out.items.confetti.dependencies).toContain("canvas-confetti");
		expect(out.items.confetti.registryDependencies).toContain(`${base}/utils.json`);
		expect(out.items["context-menu"].registryDependencies).toContain(`${base}/dropdown-menu.json`);
		expect(out.items["streaming-text"].registryDependencies).toContain(
			`${base}/internals-markdown.json`
		);
	});

	it("ships no test, harness, mock or README file", () => {
		for (const item of Object.values(out.items)) {
			for (const f of item.files) {
				expect(f.path, f.path).not.toMatch(/\.test\.|Harness|web-audio-mock|README/);
			}
		}
	});
});
