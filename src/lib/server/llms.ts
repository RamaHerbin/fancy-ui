/**
 * LLM-facing documentation
 *
 * Builds the machine-readable surface of the docs from the component
 * registry, the docs examples and the package barrels:
 *
 * - /llms.txt                        index (https://llmstxt.org), links to the Markdown pages
 * - /llms-full.txt                   every component: import, props, one working example
 * - /docs/components/<slug>.md       one component as Markdown, with every docs example
 * - /registry.json                   the same facts as JSON, for tools
 *
 * Nothing here is written by hand per component: descriptions and props come
 * from `registry.ts`, examples from `components/docs/examples`, import names
 * from the real exports, so none of it can drift from the site.
 */

import { registry, categories, categoryLabels } from "$lib/fancy-ui/registry.js";
import { examplesRegistry } from "$lib/components/docs/examples/registry.js";
import { toConsumerImports } from "$lib/docs/code.js";
import { SITE_URL, GITHUB_URL } from "$lib/site.js";
import type { ComponentMeta } from "$lib/types.js";

// Map slug → actual runtime exports of each component folder, so generated
// import examples never reference names the package does not export
// (e.g. card-3d exports CardContainer/CardBody/CardItem, not Card3D).
const componentModules = import.meta.glob("../fancy-ui/*/index.ts", { eager: true }) as Record<
	string,
	Record<string, unknown>
>;

const exportsBySlug = new Map<string, string[]>();
for (const [path, module] of Object.entries(componentModules)) {
	const slug = path.split("/").at(-2);
	if (!slug) continue;
	exportsBySlug.set(
		slug,
		Object.keys(module).filter((name) => /^[A-Z]/.test(name))
	);
}

// The React barrels, read as text (never executed: the docs build must not
// pull React in). Value exports only; `export type` lines are skipped.
const reactBarrels = import.meta.glob("/react/src/components/*/index.ts", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

const reactExportsBySlug = new Map<string, string[]>();
for (const [path, src] of Object.entries(reactBarrels)) {
	const slug = path.split("/").at(-2);
	if (!slug) continue;
	const names: string[] = [];
	for (const m of src.matchAll(/^export\s+\{([^}]+)\}\s+from/gm)) {
		for (const part of m[1].split(",")) {
			const name = part
				.trim()
				.split(/\s+as\s+/)
				.at(-1)
				?.trim();
			if (name && /^[A-Z]/.test(name)) names.push(name);
		}
	}
	if (names.length) reactExportsBySlug.set(slug, names);
}

// Docs example sources, keyed "<slug>/<Name>".
const exampleFiles = import.meta.glob("../components/docs/examples/*/*.svelte", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

const exampleSourceByKey = new Map<string, string>();
for (const [path, src] of Object.entries(exampleFiles)) {
	const [slug, file] = path.split("/").slice(-2);
	exampleSourceByKey.set(`${slug}/${file.replace(/\.svelte$/, "")}`, src);
}

/** The names to import for a component, exactly as the package exports them. */
export function importNames(component: Pick<ComponentMeta, "slug" | "name">): string[] {
	const exported = exportsBySlug.get(component.slug) ?? [];
	if (exported.includes(component.name)) return [component.name];
	return exported.length > 0 ? exported : [component.name];
}

/** The React port's names, or null when the component has no React port. */
export function reactImportNames(component: Pick<ComponentMeta, "slug" | "name">): string[] | null {
	const exported = reactExportsBySlug.get(component.slug);
	if (!exported) return null;
	if (exported.includes(component.name)) return [component.name];
	return exported;
}

export interface ExampleSource {
	name: string;
	title: string;
	description?: string;
	/** Source with package imports, ready to paste. */
	code: string;
}

/** Every docs example of a component, in the docs' order. */
export function exampleSources(slug: string): ExampleSource[] {
	return (examplesRegistry[slug] ?? []).flatMap((e) => {
		const src = exampleSourceByKey.get(`${slug}/${e.name}`);
		return src ? [{ ...e, code: toConsumerImports(src.trim()) }] : [];
	});
}

/** Longest example llms-full.txt inlines; longer ones stay on the Markdown page. */
const INLINE_EXAMPLE_MAX = 1500;

/**
 * The one example llms-full.txt inlines: BasicUsage when it is short enough,
 * else the shortest one that is. Keeps the whole file inside a model's context.
 */
export function primaryExample(slug: string): ExampleSource | undefined {
	const fits = exampleSources(slug).filter((e) => e.code.length <= INLINE_EXAMPLE_MAX);
	return (
		fits.find((e) => e.name === "BasicUsage") ??
		fits.sort((a, b) => a.code.length - b.code.length)[0]
	);
}

function doneComponents(): ComponentMeta[] {
	return Object.values(registry).filter((c) => c.status === "done" && !c.deprecated);
}

function byCategory(components: ComponentMeta[]): Map<string, ComponentMeta[]> {
	const grouped = new Map<string, ComponentMeta[]>();
	for (const category of categories) {
		const items = components
			.filter((c) => c.category === category)
			.sort((a, b) => a.name.localeCompare(b.name));
		if (items.length > 0) grouped.set(category, items);
	}
	return grouped;
}

export function docsUrl(component: Pick<ComponentMeta, "slug">): string {
	return `${SITE_URL}/docs/components/${component.slug}`;
}

export function markdownUrl(component: Pick<ComponentMeta, "slug">): string {
	return `${docsUrl(component)}.md`;
}

function sentence(text: string): string {
	const t = text.trim();
	return /[.!?]$/.test(t) ? t : `${t}.`;
}

const USAGE_GUIDE = `## Setup

Requirements: Svelte 5, Tailwind CSS v4, Node >= 20. Works in any SvelteKit or Vite + Svelte project.

### Starting a new project

\`\`\`bash
npx sv create my-app          # select Tailwind CSS in the prompts
cd my-app
npm install fancy-ui-svelte
\`\`\`

Then add the library stylesheet to \`src/app.css\`:

\`\`\`css
@import "tailwindcss";
@import "fancy-ui-svelte/tailwind.css";
\`\`\`

### Adding to an existing project (layout and styles already in place)

1. \`npm install fancy-ui-svelte\` (or pnpm/bun).
2. Find the CSS file that contains \`@import "tailwindcss";\` (usually \`src/app.css\`)
   and add ONE line right after it: \`@import "fancy-ui-svelte/tailwind.css";\`
   Do not restructure the existing CSS, theme tokens, or layout files.
3. Import components where needed: \`import { BorderBeam } from 'fancy-ui-svelte';\`
   Components are self-contained — drop them into existing markup; no provider,
   no global config, no tailwind.config changes needed.

If the project uses Tailwind v3 or no Tailwind, stop and tell the user:
fancy-ui-svelte requires Tailwind CSS v4.

## Rules for generated code

- Svelte 5 only. Use runes (\`$state\`, \`$derived\`, \`$props\`) and snippet children
  (regular child markup). Never use \`<slot>\`, \`export let\`, or \`on:click\` syntax.
- Overlay/effect components (BorderBeam, GlowBorder, NeonBorder, Meteors, Ripple,
  GlowingEffect, all backgrounds) render with \`position: absolute\` and fill their
  parent. The parent MUST have \`relative\` and usually \`overflow-hidden\`, plus an
  explicit size for backgrounds:

  \`\`\`svelte
  <div class="relative overflow-hidden rounded-xl border p-8">
    <RainbowButton>Click me</RainbowButton>
    <BorderBeam colorFrom="#9E7AFF" colorTo="#FE8BBB" />
  </div>
  \`\`\`

- Cursor components (FluidCursor, SmoothCursor, ImageTrailCursor) are global
  effects: mount them ONCE in the root \`+layout.svelte\`, not per page.
- All components are SSR-safe (canvas/WebGL work happens in \`onMount\`); no
  \`browser\` checks or dynamic imports needed.
- Do NOT import \`XxxProps\` types — only some components export them. Rely on
  the props tables in ${SITE_URL}/llms-full.txt instead.
- Most components accept \`class\` for Tailwind overrides (merged with
  \`tailwind-merge\`), but helper sub-components (e.g. ConfettiButton, ReviewCard)
  may not — only pass \`class\` when it appears in the component's props table.
- Each component also has a Markdown page with every docs example:
  ${SITE_URL}/docs/components/<slug>.md`;

const REACT_GUIDE = `## React

The same components exist for React 18/19 as \`fancy-ui-react\`, with the same
names and visual contract. Only use it when the project is React; the Svelte
package stays the reference.

\`\`\`bash
npm install fancy-ui-react
\`\`\`

\`\`\`css
/* app.css */
@import "tailwindcss";
@import "fancy-ui-react/tailwind.css";
\`\`\`

\`\`\`tsx
import "fancy-ui-react/styles.css";
import { RainbowButton } from "fancy-ui-react";
\`\`\`

Props keep their Svelte names exactly, callbacks included (\`onpercentagechange\`
stays \`onpercentagechange\`). Two mechanical renames: \`class\` becomes
\`className\`, and snippet props become \`ReactNode\` props (render functions when
the snippet takes arguments); the default snippet is \`children\`. Per-component
divergences are listed in the package README:
${GITHUB_URL}/tree/main/react#divergences-from-the-svelte-api
Package is ESM only, with four entry points: \`fancy-ui-react\`,
\`fancy-ui-react/cameleon\`, \`fancy-ui-react/styles.css\`, \`fancy-ui-react/tailwind.css\`.`;

function header(componentCount: number): string {
	return `# fancy-ui-svelte

> ${componentCount} animated UI components for Svelte 5 + Tailwind CSS v4: buttons, cards, text effects, backgrounds, cursors, and layout primitives. MIT licensed. Install with \`npm install fancy-ui-svelte\`, import from \`'fancy-ui-svelte'\`. A React edition ships as \`fancy-ui-react\`.

Docs: ${SITE_URL}/docs — Source: ${GITHUB_URL}`;
}

/**
 * Short index version, served at /llms.txt
 */
export function generateLlmsTxt(): string {
	const components = doneComponents();
	const lines: string[] = [
		header(components.length),
		"",
		USAGE_GUIDE,
		"",
		REACT_GUIDE,
		"",
		"## Components",
		"",
		"Each link is the component's Markdown page: import, props and every example.",
		"",
	];

	for (const [category, items] of byCategory(components)) {
		lines.push(`### ${categoryLabels[category as keyof typeof categoryLabels]}`, "");
		for (const c of items) {
			lines.push(`- [${c.name}](${markdownUrl(c)}): ${c.description}`);
		}
		lines.push("");
	}

	lines.push(
		"## Full reference",
		"",
		`- [llms-full.txt](${SITE_URL}/llms-full.txt): every component with its complete props table and a working example`,
		"",
		"## Optional",
		"",
		`- [registry.json](${SITE_URL}/registry.json): every component as JSON (import names, props, snippets, events, links)`,
		`- [Changelog](${SITE_URL}/docs/getting-started/changelog): release notes`,
		`- [React package README](${GITHUB_URL}/tree/main/react): React setup and divergences`,
		""
	);

	return lines.join("\n");
}

function propsSection(component: ComponentMeta): string[] {
	if (!component.props?.length) return [];
	const lines = ["", "Props:", ""];
	for (const p of component.props) {
		const required = p.required ? " (required)" : "";
		const def = p.default !== undefined ? ` = ${p.default}` : "";
		lines.push(`- \`${p.name}: ${p.type}${def}\`${required} — ${p.description}`);
	}
	return lines;
}

function reactLine(component: ComponentMeta): string[] {
	const names = reactImportNames(component);
	return names ? ["", `React: \`import { ${names.join(", ")} } from 'fancy-ui-react';\``] : [];
}

/**
 * Full reference version, served at /llms-full.txt
 */
export function generateLlmsFullTxt(): string {
	const components = doneComponents();
	const lines: string[] = [header(components.length), "", USAGE_GUIDE, "", REACT_GUIDE, ""];

	for (const [category, items] of byCategory(components)) {
		lines.push(`## ${categoryLabels[category as keyof typeof categoryLabels]}`, "");
		for (const c of items) {
			lines.push(`### ${c.name}`, "", sentence(c.description), "");
			lines.push(
				`\`\`\`ts`,
				`import { ${importNames(c).join(", ")} } from 'fancy-ui-svelte';`,
				`\`\`\``
			);
			lines.push(...reactLine(c));
			lines.push(...propsSection(c));
			if (c.slots?.length) {
				lines.push("", "Snippets:", "");
				for (const s of c.slots) lines.push(`- \`${s.name}\` — ${s.description}`);
			}
			if (c.events?.length) {
				lines.push("", "Events:", "");
				for (const e of c.events)
					lines.push(`- \`${e.name}\` (\`${e.detail}\`) — ${e.description}`);
			}
			const example = primaryExample(c.slug);
			if (example) {
				lines.push("", `Example (${example.title}):`, "", "```svelte", example.code, "```");
			} else if (exampleSources(c.slug).length) {
				lines.push("", `Examples: ${markdownUrl(c)}`);
			}
			lines.push("", `Docs: ${docsUrl(c)} — Markdown: ${markdownUrl(c)}`, "");
		}
	}

	return lines.join("\n");
}

/** Escape a value for a Markdown table cell. */
function cell(text: string): string {
	return text.replace(/\|/g, "\\|").replace(/\n+/g, " ");
}

/**
 * One component as Markdown, served at /docs/components/<slug>.md
 */
export function componentMarkdown(c: ComponentMeta): string {
	const names = importNames(c);
	const react = reactImportNames(c);
	const lines: string[] = [
		`# ${c.name}`,
		"",
		`> ${sentence(c.description)}`,
		"",
		`- Package: \`fancy-ui-svelte\` (Svelte 5 + Tailwind CSS v4)`,
		`- Category: ${categoryLabels[c.category as keyof typeof categoryLabels] ?? c.category}`,
	];
	if (c.tags?.length) lines.push(`- Tags: ${c.tags.join(", ")}`);
	if (c.dependencies?.length) lines.push(`- Dependencies: ${c.dependencies.join(", ")}`);
	lines.push(
		`- Docs: ${docsUrl(c)}`,
		`- Source: ${GITHUB_URL}/tree/main/src/lib/fancy-ui/${c.slug}`,
		"",
		"## Import",
		"",
		"```svelte",
		`<script lang="ts">`,
		`  import { ${names.join(", ")} } from 'fancy-ui-svelte';`,
		`</script>`,
		"```",
		"",
		`Setup (once per project): \`npm install fancy-ui-svelte\`, then add \`@import "fancy-ui-svelte/tailwind.css";\` after \`@import "tailwindcss";\` in your main CSS file. Full guide: ${SITE_URL}/llms.txt`
	);
	if (react) {
		lines.push(
			"",
			`React: \`import { ${react.join(", ")} } from 'fancy-ui-react';\` (same prop names; \`class\` becomes \`className\`, snippets become \`ReactNode\`).`
		);
	}

	if (c.props?.length) {
		lines.push(
			"",
			"## Props",
			"",
			"| Prop | Type | Default | Description |",
			"| --- | --- | --- | --- |"
		);
		for (const p of c.props) {
			const name = p.required ? `\`${p.name}\` (required)` : `\`${p.name}\``;
			const def = p.default !== undefined ? `\`${cell(p.default)}\`` : "—";
			lines.push(`| ${name} | \`${cell(p.type)}\` | ${def} | ${cell(p.description)} |`);
		}
	}
	if (c.slots?.length) {
		lines.push("", "## Snippets", "", "| Snippet | Description |", "| --- | --- |");
		for (const s of c.slots) lines.push(`| \`${s.name}\` | ${cell(s.description)} |`);
	}
	if (c.events?.length) {
		lines.push("", "## Events", "", "| Event | Payload | Description |", "| --- | --- | --- |");
		for (const e of c.events)
			lines.push(`| \`${e.name}\` | \`${cell(e.detail)}\` | ${cell(e.description)} |`);
	}

	const examples = exampleSources(c.slug);
	if (examples.length) {
		lines.push("", "## Examples");
		for (const e of examples) {
			lines.push("", `### ${e.title}`, "");
			if (e.description) lines.push(sentence(e.description), "");
			lines.push("```svelte", e.code, "```");
		}
	}
	lines.push("");
	return lines.join("\n");
}

export interface RegistryEntry {
	name: string;
	slug: string;
	description: string;
	category: string;
	group: string;
	tags: string[];
	dependencies: string[];
	import: { package: "fancy-ui-svelte"; names: string[] };
	react: { package: "fancy-ui-react"; names: string[] } | null;
	props: NonNullable<ComponentMeta["props"]>;
	snippets: NonNullable<ComponentMeta["slots"]>;
	events: NonNullable<ComponentMeta["events"]>;
	examples: string[];
	docs: string;
	markdown: string;
}

/**
 * Every component as JSON, served at /registry.json
 */
export function generateRegistryJson(): {
	name: string;
	homepage: string;
	llms: string;
	count: number;
	components: RegistryEntry[];
} {
	const components = [...byCategory(doneComponents()).values()].flat().map((c) => {
		const react = reactImportNames(c);
		return {
			name: c.name,
			slug: c.slug,
			description: c.description,
			category: c.category,
			group: c.group,
			tags: c.tags ?? [],
			dependencies: c.dependencies ?? [],
			import: { package: "fancy-ui-svelte" as const, names: importNames(c) },
			react: react ? { package: "fancy-ui-react" as const, names: react } : null,
			props: c.props ?? [],
			snippets: c.slots ?? [],
			events: c.events ?? [],
			examples: exampleSources(c.slug).map((e) => e.title),
			docs: docsUrl(c),
			markdown: markdownUrl(c),
		};
	});
	return {
		name: "fancy-ui-svelte",
		homepage: SITE_URL,
		llms: `${SITE_URL}/llms.txt`,
		count: components.length,
		components,
	};
}
