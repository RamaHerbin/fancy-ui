import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { registry } from "$lib/fancy-ui/registry.js";
import { buildRegistry } from "./build.js";
import type { BuildInput } from "./build.js";
import { specifiers } from "./graph.js";
import type { RegistryStack } from "./stack.js";
import { svelteStack } from "./stacks/svelte.js";

const SITE = "https://example.test";
const BASE = `${SITE}/r/svelte`;

const meta = (slugs: string[]): BuildInput["meta"] =>
	Object.fromEntries(
		slugs.map((s) => [s, { name: `Name-${s}`, description: `About ${s}`, category: "effects" }])
	);

const build = (files: Record<string, string>, slugs = ["alpha", "beta"]) =>
	buildRegistry({ stack: svelteStack, files, meta: meta(slugs), siteUrl: SITE });

const ALPHA = [
	'<script lang="ts">',
	'\timport { cn } from "$lib/utils.js";',
	'\timport type { HTMLAttributes } from "svelte/elements";',
	'\timport { onMount } from "svelte";',
	'\timport Part from "./Part.svelte";',
	'\timport { useTilt } from "./tilt.svelte.js";',
	'\timport type { BetaProps } from "../beta/types.js";',
	'\timport { ease } from "../_internals/motion/easing.js";',
	"</script>",
	"",
].join("\n");

const FIXTURE: Record<string, string> = {
	"index.ts": 'export * from "./alpha/index.js";\n',
	"registry.ts": 'import type { X } from "$lib/types.js";\n',
	"tailwind.css": "@theme {}\n",
	"_template/Template.svelte":
		'<script lang="ts">\n\timport { x } from "$lib/other.js";\n</script>\n',
	"alpha/Alpha.svelte": ALPHA,
	"alpha/Part.svelte": '<script lang="ts">\n\timport { cn } from "$lib/utils.js";\n</script>\n',
	"alpha/tilt.svelte.ts": "export const useTilt = () => 1;\n",
	"alpha/index.ts":
		'export { default as Alpha } from "./Alpha.svelte";\nexport * from "./types";\n',
	"alpha/types.ts": "export type AlphaProps = {};\n",
	"alpha/Alpha.test.ts": 'import Harness from "./AlphaHarness.test.svelte";\n',
	"alpha/AlphaHarness.test.svelte": "<div></div>\n",
	"alpha/AlphaConsumer.test.svelte": "<div></div>\n",
	"alpha/README.md": "# Alpha\n",
	"beta/Beta.svelte": '<script lang="ts">\n\timport confetti from "canvas-confetti";\n</script>\n',
	"beta/types.ts": "export type BetaProps = {};\n",
	"_internals/motion/easing.ts": 'import { clamp } from "../math.js";\nexport const ease = 1;\n',
	"_internals/math.ts": "export const clamp = 1;\n",
	"_internals/StreamText.svelte":
		'<script lang="ts">\n\timport { cn } from "$lib/utils.js";\n</script>\n',
	"sound/engine.ts": "export const e = 1;\n",
	"sound/web-audio-mock.ts": "export const m = 1;\n",
	"sound/SoundToggleHarness.test.svelte": "<div></div>\n",
};

describe("svelte stack helpers", () => {
	it("maps files to groups", () => {
		const g = svelteStack.groupOf;
		expect(g("_internals/float.ts")).toBe("internals");
		expect(g("_internals/Markdown.svelte")).toBe("internals");
		expect(g("_internals/motion/easing.ts")).toBe("internals-motion");
		expect(g("sound/sound.svelte.ts")).toBe("sound");
		expect(g("rainbow-button/RainbowButton.svelte")).toBe("rainbow-button");
		expect(g("index.ts")).toBeNull();
		expect(g("registry.ts")).toBeNull();
		expect(g("tailwind.css")).toBeNull();
		expect(g("_template/Template.svelte")).toBeNull();
	});

	it("excludes tests, test components, harnesses, the mock, READMEs and the template", () => {
		for (const p of [
			"alpha/Alpha.test.ts",
			"alpha/AlphaHarness.test.svelte",
			"alpha/AlphaConsumer.test.svelte",
			"alpha/AlphaHarness.svelte",
			"alpha/README.md",
			"sound/web-audio-mock.ts",
			"_template/Template.svelte",
			"alpha/alpha.css",
		]) {
			expect(svelteStack.isExcluded(p) || !svelteStack.isKeptKind(p), p).toBe(true);
		}
		expect(svelteStack.isExcluded("alpha/Alpha.svelte")).toBe(false);
		expect(svelteStack.isExcluded("alpha/tilt.svelte.ts")).toBe(false);
	});

	it("treats svelte, svelte/*, @sveltejs/*, $app/* and $env/* as the framework", () => {
		for (const s of [
			"svelte",
			"svelte/elements",
			"@sveltejs/kit",
			"$app/navigation",
			"$env/static/public",
		]) {
			expect(svelteStack.isFrameworkPackage(s), s).toBe(true);
		}
		expect(svelteStack.isFrameworkPackage("svelte-motion")).toBe(false);
		expect(svelteStack.isFrameworkPackage("three")).toBe(false);
	});
});

describe("buildRegistry with the svelte stack on fixtures", () => {
	const out = build(FIXTURE);

	it("emits one item per component folder and shared module", () => {
		expect(Object.keys(out.items)).toEqual([
			"alpha",
			"beta",
			"internals",
			"internals-motion",
			"sound",
		]);
		expect(out.index.$schema).toBe("https://shadcn-svelte.com/schema/registry.json");
		expect(out.items.alpha.$schema).toBe("https://shadcn-svelte.com/schema/registry-item.json");
		expect(out.index.name).toBe("fancy-ui");
	});

	it("ships every file as registry:ui under fancy/<rel>, with its repository path", () => {
		const alpha = out.items.alpha;
		expect(alpha.type).toBe("registry:ui");
		expect(alpha.files.map((f) => [f.path, f.type, f.target])).toEqual([
			["src/lib/fancy-ui/alpha/Alpha.svelte", "registry:ui", "fancy/alpha/Alpha.svelte"],
			["src/lib/fancy-ui/alpha/Part.svelte", "registry:ui", "fancy/alpha/Part.svelte"],
			["src/lib/fancy-ui/alpha/index.ts", "registry:ui", "fancy/alpha/index.ts"],
			["src/lib/fancy-ui/alpha/tilt.svelte.ts", "registry:ui", "fancy/alpha/tilt.svelte.ts"],
			["src/lib/fancy-ui/alpha/types.ts", "registry:ui", "fancy/alpha/types.ts"],
		]);
		const motion = out.items["internals-motion"];
		expect(motion.type).toBe("registry:lib");
		expect(motion.title).toBe("Shared internals (motion)");
		expect(motion.files[0]).toMatchObject({
			type: "registry:ui",
			target: "fancy/_internals/motion/easing.ts",
		});
		expect(out.items.internals.type).toBe("registry:lib");
		expect(out.items.sound.type).toBe("registry:lib");
		expect(out.items.sound.files.map((f) => f.target)).toEqual(["fancy/sound/engine.ts"]);
	});

	it('rewrites "$lib/utils.js" to the utils placeholder and keeps every other specifier', () => {
		const alpha = out.items.alpha.files[0].content as string;
		expect(alpha).toBe(ALPHA.replace('"$lib/utils.js"', '"$UTILS$.js"'));
		expect(alpha).toContain('from "./tilt.svelte.js"');
		expect(
			out.items.internals.files.find((f) => f.target?.endsWith("StreamText.svelte"))?.content
		).toContain('import { cn } from "$UTILS$.js";');
		expect(alpha).not.toContain("use client");
	});

	it("follows sibling, .svelte.js, cross-component and internals edges as full URLs", () => {
		expect(out.items.alpha.registryDependencies).toEqual([
			`${BASE}/beta.json`,
			`${BASE}/internals.json`,
			`${BASE}/internals-motion.json`,
		]);
		expect(out.items["internals-motion"].registryDependencies).toEqual([`${BASE}/internals.json`]);
	});

	it("records npm packages but never the framework or aliases", () => {
		expect(out.items.alpha.dependencies).toBeUndefined();
		expect(out.items.beta.dependencies).toEqual(["canvas-confetti"]);
		expect(out.items.beta.devDependencies).toEqual(["@types/canvas-confetti"]);
		expect(out.items.beta.docs).toBe("Installs canvas-confetti as a dependency.");
	});

	it("builds an index without content", () => {
		for (const item of out.index.items) {
			expect(item.$schema).toBeUndefined();
			for (const f of item.files) {
				expect(f).not.toHaveProperty("content");
				expect(f.type).toBe("registry:ui");
				expect(f.target?.startsWith("fancy/")).toBe(true);
			}
		}
	});

	it("throws on any other $lib import in a kept file, naming the file", () => {
		expect(() =>
			build({
				"alpha/Alpha.svelte":
					'<script lang="ts">\n\timport { x } from "$lib/other.js";\n</script>\n',
			})
		).toThrow(/src\/lib\/fancy-ui\/alpha\/Alpha\.svelte imports "\$lib\/other\.js"/);
	});

	it("throws when a kept file imports a test component", () => {
		expect(() =>
			build({
				"alpha/Alpha.svelte":
					'<script lang="ts">\n\timport H from "./AlphaHarness.test.svelte";\n</script>\n',
				"alpha/AlphaHarness.test.svelte": "<div></div>\n",
			})
		).toThrow(/excluded/);
	});

	it("throws on a component folder without metadata or colliding with a shared item", () => {
		expect(() => build({ "zeta/Zeta.svelte": "<div></div>\n" })).toThrow(
			/src\/lib\/fancy-ui\/zeta\/ has no entry/
		);
		expect(() => build({ "internals/X.svelte": "<div></div>\n" }, ["internals"])).toThrow(
			/duplicate item name "internals"/
		);
	});
});

describe("buildRegistry with the svelte stack on the real src/lib/fancy-ui tree", () => {
	const root = `${resolve(process.cwd(), "src/lib/fancy-ui")}/`;
	const files: Record<string, string> = {};
	for (const entry of readdirSync(root, { recursive: true }) as string[]) {
		const rel = entry.split("\\").join("/");
		if (/\.(svelte|ts)$/.test(rel)) files[rel] = readFileSync(root + rel, "utf8");
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
		stack: svelteStack,
		files,
		meta: metaInput,
		siteUrl: "https://fancy-ui.rama.app",
	});
	const base = "https://fancy-ui.rama.app/r/svelte";
	const all = Object.values(out.items).flatMap((i) => i.files);

	it("emits 149 items (146 components + 3 shared)", () => {
		expect(Object.keys(out.items)).toHaveLength(149);
		expect(out.index.items).toHaveLength(149);
		expect(
			Object.values(out.items)
				.filter((i) => i.type === "registry:lib")
				.map((i) => i.name)
		).toEqual(["internals", "internals-motion", "sound"]);
	});

	// Observed on 2026-10-21: 458 shipped files. The gate pins the exact number.
	it("ships 458 files, every one registry:ui under fancy/<rel>", () => {
		expect(all).toHaveLength(458);
		for (const f of all) {
			expect(f.type).toBe("registry:ui");
			expect(f.path.startsWith("src/lib/fancy-ui/"), f.path).toBe(true);
			expect(f.target).toBe(`fancy/${f.path.slice("src/lib/fancy-ui/".length)}`);
		}
	});

	it("leaves no $lib/ specifier and no client directive in any shipped file", () => {
		for (const f of all) {
			const specs = specifiers(f.content ?? "");
			expect(
				specs.filter((s) => s.startsWith("$lib/")),
				f.path
			).toEqual([]);
			expect(
				specs.filter((s) => s.startsWith("$") && s !== "$UTILS$.js"),
				f.path
			).toEqual([]);
			expect(f.content, f.path).not.toMatch(/^\s*["']use client["']/);
		}
		const rb = out.items["rainbow-button"].files.find((f) =>
			f.path.endsWith("RainbowButton.svelte")
		);
		expect(rb?.content).toContain('from "$UTILS$.js"');
	});

	it("ships no test, harness, mock, README or template file", () => {
		for (const f of all) {
			expect(f.path, f.path).not.toMatch(/\.test\.|Harness|web-audio-mock|README|_template\//);
		}
	});

	it("records the known cross-item edges and npm packages", () => {
		const deps = (name: string) => out.items[name].registryDependencies ?? [];
		// The 19 cross-component import statements of the sources, as 12 item edges.
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
		expect(deps("context-menu")).toContain(`${base}/dropdown-menu.json`);
		expect(out.items.confetti.dependencies).toEqual(["canvas-confetti"]);
		expect(out.items.confetti.devDependencies).toEqual(["@types/canvas-confetti"]);
		expect(out.items["image-trail-cursor"].dependencies).toEqual(["gsap"]);
		expect(out.items["line-reveal"].dependencies).toEqual(["@chenglou/pretext"]);
		for (const item of Object.values(out.items)) {
			for (const dep of item.dependencies ?? []) {
				expect(dep, item.name).not.toMatch(/^(svelte|@sveltejs\/|\$)/);
			}
			for (const url of item.registryDependencies ?? []) {
				expect(url.startsWith(`${base}/`), url).toBe(true);
				expect(out.items[url.slice(base.length + 1, -".json".length)], url).toBeDefined();
			}
		}
	});
});

describe("stack knobs a placement-by-path package needs", () => {
	// A stack that leaves placement to the CLI: no target, a steering path,
	// one file type for every item, its own kinds and framework.
	const pathStack: RegistryStack = {
		...svelteStack,
		id: "vue",
		isKeptKind: (p) => /\.(vue|ts|css)$/.test(p),
		isCode: (p) => /\.(vue|ts)$/.test(p),
		isExcluded: (p) => /\.test\.ts$/.test(p),
		isFrameworkPackage: (s) => /^(vue|@vue\/|nuxt|#imports)/.test(s),
		pathFor: (rel) => `src/components/ui/fancy/${rel}`,
		targetFor: () => undefined,
		transform: (_rel, source) => source,
	};
	const out = buildRegistry({
		stack: pathStack,
		files: {
			"alpha/Alpha.vue":
				'import { ref } from "vue";\nimport { ease } from "../_internals/motion/easing.js";\n',
			"alpha/alpha.css": ".a{}\n",
			"alpha/Alpha.test.ts": "export {};\n",
			"_internals/motion/easing.ts": "export const ease = 1;\n",
		},
		meta: meta(["alpha"]),
		siteUrl: SITE,
	});

	it("omits the target key in items and index when targetFor returns undefined", () => {
		const files = [
			...Object.values(out.items).flatMap((i) => i.files),
			...out.index.items.flatMap((i) => i.files),
		];
		expect(files.length).toBeGreaterThan(0);
		for (const f of files) expect(f).not.toHaveProperty("target");
	});

	it("writes the steering path, the stack's file type and its own kinds", () => {
		expect(out.items.alpha.files.map((f) => [f.path, f.type])).toEqual([
			["src/components/ui/fancy/alpha/Alpha.vue", "registry:ui"],
			["src/components/ui/fancy/alpha/alpha.css", "registry:ui"],
		]);
		expect(out.items["internals-motion"].type).toBe("registry:lib");
		expect(out.items["internals-motion"].files[0].type).toBe("registry:ui");
		expect(out.items.alpha.dependencies).toBeUndefined();
		expect(out.items.alpha.registryDependencies).toEqual([`${BASE}/internals-motion.json`]);
	});
});
