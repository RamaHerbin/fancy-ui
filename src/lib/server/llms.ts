/**
 * LLM-facing documentation
 *
 * Builds the machine-readable surface of the docs from the component
 * registry, the docs examples and the package barrels:
 *
 * - /llms.txt                        index (https://llmstxt.org), links to the Markdown pages
 * - /llms-full.txt                   every component: import, props, one working example
 * - /docs/components/<slug>.md       one component as Markdown (Svelte), with every docs example
 * - /docs/components/react/<slug>.md the same page for the React package
 * - /docs/components/vue/<slug>.md   the same page for the Vue package
 * - /registry.json                   the same facts as JSON, for tools (v2: keyed by framework,
 *                                    with each framework's Markdown page and copy source)
 *
 * Nothing here is written by hand per component: descriptions and props come
 * from `registry.ts`, examples from `components/docs/examples` (Svelte) and
 * each package's `docs-examples` folder (React, Vue), import and type names
 * from the real exports, so none of it can drift from the site.
 */

import { registry, categories, categoryLabels } from "$lib/fancy-ui/registry.js";
import { examplesRegistry } from "$lib/components/docs/examples/registry.js";
import { toConsumerImports } from "$lib/docs/code.js";
import { getUsageSnippet } from "$lib/docs/framework-snippets.js";
import { INSTALL_SNIPPETS } from "$lib/docs/install-snippets.js";
import type { Framework } from "$lib/inspiration/types.js";
import { SITE_URL, GITHUB_URL } from "$lib/site.js";
import { recipesRegistry, recipeMarkdownUrl, type Recipe } from "$lib/docs/recipes/registry.js";
import { recipeMarkdown } from "$lib/docs/recipes/markdown.js";
import type { ComponentMeta } from "$lib/types.js";
import {
	portFolderOf,
	svelteExportsBySlug,
	reactExportsBySlug,
	vueExportsBySlug,
	svelteTypesBySlug,
	reactTypesBySlug,
	vueTypesBySlug,
} from "./barrels.js";
import { REGISTRY_BASE, copyCommandFor } from "./registry/constants.js";
import { REGISTRY_BASE_SVELTE, REGISTRY_BASE_VUE } from "$lib/copy-source.js";
import {
	portEventName,
	portPropName,
	portSlotName,
	type PortOptions,
} from "$lib/docs/port-names.js";
import { FRAMEWORKS } from "$lib/inspiration/types.js";
import { copySourcesFor } from "./copy-availability.js";
import { portCallbacksFor } from "./port-callbacks.js";
import { variantFor, type Availability } from "./variants.js";
import { vueModelsFor } from "./vue-models.js";

export type DocsFramework = Framework;

// Export names per package come from the real barrels (see barrels.ts).
const exportsBySlug = svelteExportsBySlug;

const TYPES_BY_FRAMEWORK: Record<DocsFramework, ReadonlyMap<string, string[]>> = {
	svelte: svelteTypesBySlug,
	react: reactTypesBySlug,
	vue: vueTypesBySlug,
};

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

/** The Vue port's names, or null when the component has no Vue port. */
export function vueImportNames(component: Pick<ComponentMeta, "slug" | "name">): string[] | null {
	const exported = vueExportsBySlug.get(component.slug);
	if (!exported) return null;
	if (exported.includes(component.name)) return [component.name];
	return exported;
}

/** The names to import from a framework's package, or null when it has no port. */
export function importNamesFor(
	component: Pick<ComponentMeta, "slug" | "name">,
	framework: DocsFramework
): string[] | null {
	if (framework === "react") return reactImportNames(component);
	if (framework === "vue") return vueImportNames(component);
	return importNames(component);
}

/** Types a framework's package exports for a component (props types and helpers). */
export function typeExports(
	component: Pick<ComponentMeta, "slug">,
	framework: DocsFramework
): string[] {
	return TYPES_BY_FRAMEWORK[framework].get(component.slug) ?? [];
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

/** The component's Markdown page for a framework (Svelte keeps the historical URL). */
export function markdownUrl(
	component: Pick<ComponentMeta, "slug">,
	framework: DocsFramework = "svelte"
): string {
	if (framework === "svelte") return `${docsUrl(component)}.md`;
	return `${SITE_URL}/docs/components/${framework}/${component.slug}.md`;
}

function sentence(text: string): string {
	const t = text.trim();
	return /[.!?]$/.test(t) ? t : `${t}.`;
}

const USAGE_GUIDE = `## Setup

Requirements: Svelte 5.20+, Tailwind CSS v4, Node 20.19+. Works in any SvelteKit or Vite + Svelte project.

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

### Or copy the source

To own the source instead of depending on the package, every component is also a
registry item: \`${copyCommandFor("<slug>", "svelte")}\` (the index is at
${REGISTRY_BASE_SVELTE}/registry.json). The files land in
\`$lib/components/ui/fancy/<slug>/\`; the shared \`_internals\` and \`sound\`
modules it needs are pulled in automatically. Import from there
(\`$lib/components/ui/fancy/<slug>\`) instead of \`fancy-ui-svelte\`; \`cn\` comes
from the project's own \`$lib/utils\`. The components' \`light-dark()\` colours
follow \`color-scheme\`: add \`:root { color-scheme: light dark } .dark { color-scheme: dark }\`
to the project CSS if it does not declare it. Setup, updates and limits:
${SITE_URL}/docs/getting-started/copy-source.

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

- Cursor components each have their own container rule:
  - FluidCursor defaults to \`contained\` (true): it fills its nearest positioned parent, so give that parent \`relative\` and an explicit size. Pass \`contained={false}\` (Vue: \`:contained="false"\`) only for a full-viewport overlay, then mount it once (e.g. in the root layout).
  - ImageTrailCursor fills its parent and only reacts to the pointer inside it: put it in the parent where the trail should appear, and give that parent an explicit height. It is not a page-wide effect.
  - SmoothCursor is \`position: fixed\` over the whole viewport: mount it once (e.g. in the root layout), not per section.
- All components are SSR-safe (canvas/WebGL work happens in \`onMount\`); no
  \`browser\` checks or dynamic imports needed.
- Exported types are listed per component (the \`Types:\` line of its entry in
  ${SITE_URL}/llms-full.txt and of its Markdown page); import those as types,
  e.g. \`import { type BorderBeamProps } from 'fancy-ui-svelte';\`. When a
  component lists no props type, use \`ComponentProps<typeof X>\` from \`svelte\`.
- Most components accept \`class\` for Tailwind overrides (merged with
  \`tailwind-merge\`), but helper sub-components (e.g. ConfettiButton, ReviewCard)
  may not — only pass \`class\` when it appears in the component's props table.
- Each component also has a Markdown page with every docs example:
  ${SITE_URL}/docs/components/<slug>.md (Svelte),
  ${SITE_URL}/docs/components/react/<slug>.md (React) and
  ${SITE_URL}/docs/components/vue/<slug>.md (Vue).`;

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

Props keep their Svelte names, with three mechanical renames: \`class\` becomes
\`className\`; snippet props become \`ReactNode\` props (render functions when the
snippet takes arguments), the default snippet being \`children\`; and a callback
takes the name the React port declares, which is the camel-cased handler for a
DOM event (\`onclick\` becomes \`onClick\`) and the Svelte name otherwise
(\`onpercentagechange\` stays \`onpercentagechange\`). Each component's React
Markdown page prints the exact names. Per-component divergences are listed in
the package README:
${GITHUB_URL}/tree/main/react#divergences-from-the-svelte-api
Package is ESM only, with four entry points: \`fancy-ui-react\`,
\`fancy-ui-react/cameleon\`, \`fancy-ui-react/styles.css\`, \`fancy-ui-react/tailwind.css\`.

Prefer the package. To own the source instead, every component is also a
registry item: \`${copyCommandFor("<slug>")}\` (the index is at
${REGISTRY_BASE}/registry.json). The files land in \`fancy/\` under the project's
\`ui\` alias; import from there (\`@/components/ui/fancy/components/<slug>\`), not
from \`fancy-ui-react\`, and skip \`fancy-ui-react/styles.css\` (each component
imports its own CSS). The components' \`light-dark()\` colours follow
\`color-scheme\`: add \`:root { color-scheme: light dark } .dark { color-scheme: dark }\`
to the project CSS if it does not declare it. Setup, updates and limits:
${SITE_URL}/docs/getting-started/copy-source.`;

const VUE_GUIDE = `## Vue

The same components exist for Vue 3.5+ as \`fancy-ui-vue\`, with the same names
and visual contract. Only use it when the project is Vue; the Svelte package
stays the reference.

\`\`\`bash
npm install fancy-ui-vue
\`\`\`

\`\`\`css
/* app.css */
@import "tailwindcss";
@import "fancy-ui-vue/tailwind.css";
@import "fancy-ui-vue/styles.css";
\`\`\`

\`\`\`vue
<script setup lang="ts">
import { RainbowButton } from "fancy-ui-vue";
</script>
\`\`\`

Props keep their Svelte names. Snippet props become named slots (the default
snippet is the default slot); a bindable prop the Vue port declares as a model
is a \`v-model:<name>\` (except \`ref\`, exposed via \`defineExpose({ ref })\`: put
a template ref on the component and read \`.ref\`); some bindables are plain
props in Vue. Every component sets \`inheritAttrs: false\`:
\`class\` is a declared prop, merged where the Svelte component applies it
(not always the root element), and only on components whose props table lists
it. Other attributes do not fall through; they reach the DOM only on the
components the package README lists as forwarding native attributes.
Callbacks are bound as listeners: a callback the Vue port declares in camel
case (\`onPercentageChange\`) is \`@percentage-change\`, a DOM event keeps its
name (\`onclick\` is \`@click\`). Each component's Vue Markdown page prints the
exact names. Per-component divergences are listed in the package README:
${GITHUB_URL}/tree/main/vue#divergences-from-the-svelte-api
Package is ESM only, with four entry points: \`fancy-ui-vue\`,
\`fancy-ui-vue/cameleon\`, \`fancy-ui-vue/styles.css\`, \`fancy-ui-vue/tailwind.css\`.

Prefer the package. To own the source instead, every component is also a
registry item: \`${copyCommandFor("<slug>", "vue")}\` (the index is at
${REGISTRY_BASE_VUE}/registry.json). The files land in \`fancy/\` under the project's
\`ui\` alias; import from there (\`@/components/ui/fancy/components/<slug>\`), not
from \`fancy-ui-vue\`, and skip \`fancy-ui-vue/styles.css\` (each component
carries its own styles). The components' \`light-dark()\` colours follow
\`color-scheme\`: add \`:root { color-scheme: light dark } .dark { color-scheme: dark }\`
to the project CSS if it does not declare it. Setup, updates and limits:
${SITE_URL}/docs/getting-started/copy-source. In Nuxt, keep the copied tree out
of component auto-import: \`components: { dirs: [{ path: "~/components", ignore: ["ui/fancy/**"] }] }\`.`;

function header(componentCount: number): string {
	return `# fancy-ui-svelte

> ${componentCount} animated UI components for Svelte 5 + Tailwind CSS v4: buttons, cards, text effects, backgrounds, cursors, and layout primitives. MIT licensed. Install with \`npm install fancy-ui-svelte\`, import from \`'fancy-ui-svelte'\`. The same components ship for React as \`fancy-ui-react\` and for Vue as \`fancy-ui-vue\`, and every package can also be copied into a project as source.

Docs: ${SITE_URL}/docs — Source: ${GITHUB_URL}`;
}

/**
 * The "Recipes" section of llms.txt, between the component index and the full
 * reference: one link per composed recipe, each line as Markdown, ending with
 * a blank line. The section is not printed at all when there are no recipes.
 */
export function recipesSection(recipes: readonly Recipe[] = recipesRegistry): string[] {
	if (!recipes.length) return [];
	return [
		"## Recipes",
		"",
		"End-to-end patterns that combine several components around one interaction. Each link is the recipe's Markdown page with the steps, the pitfalls and the code in all three frameworks.",
		"",
		...recipes.map((r) => `- [${r.title}](${recipeMarkdownUrl(r.slug)}): ${r.summary}`),
		"",
	];
}

/**
 * A recipe's Markdown nested under "## Recipes": every heading moves down two
 * levels (outside code fences) so the recipe title becomes an h3.
 */
function nestedRecipeMarkdown(recipe: Recipe): string[] {
	let fenced = false;
	return recipeMarkdown(recipe)
		.trimEnd()
		.split("\n")
		.map((line) => {
			if (line.startsWith("```")) fenced = !fenced;
			return !fenced && /^#{1,4} /.test(line) ? `##${line}` : line;
		});
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
		VUE_GUIDE,
		"",
		"## Components",
		"",
		"Each link is the component's Markdown page: import, props and every example. The name links to the Svelte page; React and Vue pages follow when the component is ported.",
		"",
	];

	for (const [category, items] of byCategory(components)) {
		lines.push(`### ${categoryLabels[category as keyof typeof categoryLabels]}`, "");
		for (const c of items) {
			const ports = (["react", "vue"] as const)
				.filter((fw) => importNamesFor(c, fw))
				.map((fw) => `[${fw === "react" ? "React" : "Vue"}](${markdownUrl(c, fw)})`);
			const suffix = ports.length ? ` (${ports.join(", ")})` : "";
			lines.push(`- [${c.name}](${markdownUrl(c)}): ${c.description}${suffix}`);
		}
		lines.push("");
	}

	lines.push(...recipesSection());

	lines.push(
		"## Full reference",
		"",
		`- [llms-full.txt](${SITE_URL}/llms-full.txt): every component with its complete props table and a working example`,
		"",
		"## Optional",
		"",
		`- [registry.json](${SITE_URL}/registry.json): every component as JSON, per framework: import names, Markdown page, copy-source item and availability, plus props, snippets and events`,
		`- [Changelog](${SITE_URL}/docs/getting-started/changelog): release notes`,
		`- [React package README](${GITHUB_URL}/tree/main/react): React setup and divergences`,
		`- [Vue package README](${GITHUB_URL}/tree/main/vue): Vue setup and divergences`,
		`- [humans.txt](${SITE_URL}/humans.txt): the people behind the library, and a few secrets for agents that read to the end`,
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

/** The React and Vue import lines of a ported component. */
function portLines(component: ComponentMeta): string[] {
	const react = reactImportNames(component);
	const vue = vueImportNames(component);
	return [
		...(react ? ["", `React: \`import { ${react.join(", ")} } from 'fancy-ui-react';\``] : []),
		...(vue ? ["", `Vue: \`import { ${vue.join(", ")} } from 'fancy-ui-vue';\``] : []),
	];
}

function typesLine(component: ComponentMeta, framework: DocsFramework): string[] {
	const types = typeExports(component, framework);
	return types.length ? ["", `Types: ${types.map((t) => `\`${t}\``).join(", ")}`] : [];
}

/**
 * Full reference version, served at /llms-full.txt
 */
export function generateLlmsFullTxt(): string {
	const components = doneComponents();
	const lines: string[] = [
		header(components.length),
		"",
		USAGE_GUIDE,
		"",
		REACT_GUIDE,
		"",
		VUE_GUIDE,
		"",
	];

	for (const [category, items] of byCategory(components)) {
		lines.push(`## ${categoryLabels[category as keyof typeof categoryLabels]}`, "");
		for (const c of items) {
			lines.push(`### ${c.name}`, "", sentence(c.description), "");
			lines.push(
				`\`\`\`ts`,
				`import { ${importNames(c).join(", ")} } from 'fancy-ui-svelte';`,
				`\`\`\``
			);
			lines.push(...typesLine(c, "svelte"));
			lines.push(...portLines(c));
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

	if (recipesRegistry.length) {
		lines.push("## Recipes", "");
		for (const r of recipesRegistry) lines.push(...nestedRecipeMarkdown(r), "");
	}

	return lines.join("\n");
}

/**
 * A Svelte action row (`use:soundFeedback`) is a hook in React and a
 * composable in Vue, both named `useSoundFeedback`; null for any other row.
 */
function actionHook(name: string): string | null {
	const action = /^use:([a-z]\w*)$/.exec(name)?.[1];
	return action ? `use${action[0].toUpperCase()}${action.slice(1)}` : null;
}

/** Escape a value for a Markdown table cell. */
function cell(text: string): string {
	return text.replace(/\|/g, "\\|").replace(/\n+/g, " ");
}

interface FrameworkDocs {
	package: string;
	label: string;
	stack: string;
	/** Code fence language of the import block. */
	lang: "svelte" | "tsx" | "vue";
	importBlock(names: string[]): string[];
	/** One-time setup, as Markdown lines. */
	setup: string[];
	source(slug: string): string;
	/** How the Svelte-named API maps onto this package, or null for Svelte itself. */
	mapping: string | null;
	slotsHeading: string;
	slotsColumn: string;
}

const FRAMEWORK_DOCS: Record<DocsFramework, FrameworkDocs> = {
	svelte: {
		package: "fancy-ui-svelte",
		label: "Svelte",
		stack: "Svelte 5 + Tailwind CSS v4",
		lang: "svelte",
		importBlock: (names) => [
			`<script lang="ts">`,
			`  import { ${names.join(", ")} } from 'fancy-ui-svelte';`,
			`</script>`,
		],
		setup: [
			`Setup (once per project): \`npm install fancy-ui-svelte\`, then add \`@import "fancy-ui-svelte/tailwind.css";\` after \`@import "tailwindcss";\` in your main CSS file. Full guide: ${SITE_URL}/llms.txt`,
		],
		source: (slug) => `${GITHUB_URL}/tree/main/src/lib/fancy-ui/${slug}`,
		mapping: null,
		slotsHeading: "Snippets",
		slotsColumn: "Snippet",
	},
	react: {
		package: "fancy-ui-react",
		label: "React",
		stack: "React 18/19 + Tailwind CSS v4",
		lang: "tsx",
		importBlock: (names) => [`import { ${names.join(", ")} } from 'fancy-ui-react';`],
		setup: [
			'Setup (once per project): `npm install fancy-ui-react`, then put these lines in your main CSS file (the stylesheet import goes right after `@import "tailwindcss";`):',
			"",
			"```css",
			INSTALL_SNIPPETS.react.stylesheet,
			"```",
			"",
			`and import the component styles once in the app entry: \`import "fancy-ui-react/styles.css";\`. Full guide: ${SITE_URL}/llms.txt`,
		],
		source: (slug) => `${GITHUB_URL}/tree/main/react/src/${portFolderOf("react", slug)}`,
		mapping: `The names below are the ones to write in React; when one differs from the Svelte name, the Svelte name follows in parentheses. \`class\` becomes \`className\`, a callback takes the name the React port declares (\`onclick\` becomes \`onClick\`), snippets become \`ReactNode\` props (render functions when they take arguments) and the default snippet is \`children\`. Divergences: ${GITHUB_URL}/tree/main/react#divergences-from-the-svelte-api`,
		slotsHeading: "Node props",
		slotsColumn: "Prop",
	},
	vue: {
		package: "fancy-ui-vue",
		label: "Vue",
		stack: "Vue 3.5+ + Tailwind CSS v4",
		lang: "vue",
		importBlock: (names) => [
			`<script setup lang="ts">`,
			`import { ${names.join(", ")} } from 'fancy-ui-vue';`,
			`</script>`,
		],
		setup: [
			'Setup (once per project): `npm install fancy-ui-vue`, then put these lines in your main CSS file (the stylesheet imports go right after `@import "tailwindcss";`):',
			"",
			"```css",
			INSTALL_SNIPPETS.vue.stylesheet,
			"```",
			"",
			`Full guide: ${SITE_URL}/llms.txt`,
		],
		source: (slug) => `${GITHUB_URL}/tree/main/vue/src/${portFolderOf("vue", slug)}`,
		mapping: `The names below are the ones to write in a Vue template; when one differs from the Svelte name, the Svelte name follows in parentheses. Snippets become named slots (\`#default\` is the default snippet), a prop the Vue port declares as a model is a \`v-model:<name>\` (except \`ref\`, exposed via \`defineExpose({ ref })\`: put a template ref on the component and read \`.ref\`) and callbacks are listeners (\`onclick\` is \`@click\`). Every component sets \`inheritAttrs: false\`: \`class\` is a declared prop, merged where the Svelte component applies it (not always the root element), and only when the props table below lists it; other attributes do not fall through unless the package README lists the component as forwarding native attributes. Divergences: ${GITHUB_URL}/tree/main/vue#divergences-from-the-svelte-api`,
		slotsHeading: "Slots",
		slotsColumn: "Slot",
	},
};

/**
 * One component as Markdown for one framework, served at
 * /docs/components/<slug>.md (Svelte) and /docs/components/<framework>/<slug>.md.
 * Every line of code comes from that framework's package: a component with no
 * React or Vue docs example gets its import line and a note, never another
 * framework's code.
 */
export function componentMarkdown(c: ComponentMeta, framework: DocsFramework = "svelte"): string {
	const fw = FRAMEWORK_DOCS[framework];
	const names = importNamesFor(c, framework) ?? [c.name];
	const types = typeExports(c, framework);
	const lines: string[] = [
		`# ${c.name}`,
		"",
		`> ${sentence(c.description)}`,
		"",
		`- Package: \`${fw.package}\` (${fw.stack})`,
		`- Category: ${categoryLabels[c.category as keyof typeof categoryLabels] ?? c.category}`,
	];
	if (c.tags?.length) lines.push(`- Tags: ${c.tags.join(", ")}`);
	if (c.dependencies?.length) lines.push(`- Dependencies: ${c.dependencies.join(", ")}`);
	if (types.length) lines.push(`- Types: ${types.map((t) => `\`${t}\``).join(", ")}`);
	lines.push(
		`- Docs: ${docsUrl(c)}`,
		`- Source: ${fw.source(c.slug)}`,
		"",
		"## Import",
		"",
		`\`\`\`${fw.lang}`,
		...fw.importBlock(names),
		"```",
		"",
		...fw.setup
	);
	if (framework === "svelte") {
		const react = reactImportNames(c);
		if (react) {
			lines.push(
				"",
				`React: \`import { ${react.join(", ")} } from 'fancy-ui-react';\` (\`class\` becomes \`className\`, snippets become \`ReactNode\`, DOM callbacks are camel-cased; exact names on ${markdownUrl(c, "react")}).`
			);
		}
	}
	if (fw.mapping) lines.push("", fw.mapping);

	// React and Vue tables print the name each port really takes (see port-names.ts).
	const port = framework === "svelte" ? null : framework;
	const options: PortOptions = port
		? {
				reactCallbacks: portCallbacksFor("react", c.slug, c.name),
				vueCallbacks: portCallbacksFor("vue", c.slug, c.name),
				vueModels: vueModelsFor(c.slug, c.name),
			}
		: {};
	const label = (svelteName: string, portName: string | null) =>
		portName && portName !== svelteName
			? `\`${portName}\` (Svelte \`${svelteName}\`)`
			: `\`${svelteName}\``;

	if (c.props?.length) {
		lines.push(
			"",
			"## Props",
			"",
			"| Prop | Type | Default | Description |",
			"| --- | --- | --- | --- |"
		);
		for (const p of c.props) {
			const named = label(
				p.name,
				port ? (actionHook(p.name) ?? portPropName(p, port, options)) : null
			);
			const name = p.required ? `${named} (required)` : named;
			const def = p.default !== undefined ? `\`${cell(p.default)}\`` : "—";
			lines.push(`| ${name} | \`${cell(p.type)}\` | ${def} | ${cell(p.description)} |`);
		}
	}
	if (c.slots?.length) {
		lines.push(
			"",
			`## ${fw.slotsHeading}`,
			"",
			`| ${fw.slotsColumn} | Description |`,
			"| --- | --- |"
		);
		for (const s of c.slots) {
			const named = label(s.name, port ? portSlotName(s.name, port) : null);
			lines.push(`| ${named} | ${cell(s.description)} |`);
		}
	}
	if (c.events?.length) {
		lines.push("", "## Events", "", "| Event | Payload | Description |", "| --- | --- | --- |");
		for (const e of c.events) {
			const named = label(e.name, port ? portEventName(e.name, port, options) : null);
			lines.push(`| ${named} | \`${cell(e.detail)}\` | ${cell(e.description)} |`);
		}
	}

	if (framework === "svelte") {
		const examples = exampleSources(c.slug);
		if (examples.length) {
			lines.push("", "## Examples");
			for (const e of examples) {
				lines.push("", `### ${e.title}`, "");
				if (e.description) lines.push(sentence(e.description), "");
				lines.push("```svelte", e.code, "```");
			}
		}
	} else {
		const snippet = getUsageSnippet(c.slug, framework);
		lines.push("", "## Example", "");
		if (snippet) {
			lines.push(`\`\`\`${snippet.lang}`, snippet.code, "```");
		} else {
			lines.push(
				`No ${fw.label} example is published for this component yet: start from the import above and the props table. The full examples are Svelte-only, on ${markdownUrl(c)}.`
			);
		}
	}
	lines.push("");
	return lines.join("\n");
}

/** One value per framework, in canonical order (svelte, react, vue). */
export type PerFramework<T> = Record<DocsFramework, T>;

export interface RegistryPackage {
	/** The npm package. */
	name: string;
	/** The one-line install. */
	install: string;
	/** The copy-into-your-project registry index of that framework. */
	registry: string;
}

export interface RegistryEntry {
	name: string;
	slug: string;
	description: string;
	category: string;
	group: string;
	tags: string[];
	dependencies: string[];
	/** The names to import from each package, or null when that framework has no port. */
	imports: PerFramework<{ package: string; names: string[] } | null>;
	/** The component's Markdown page per framework, or null when that framework has no port. */
	docs: PerFramework<string | null>;
	/** The copy-into-your-project registry item per framework, or null when that registry ships none. */
	copySource: PerFramework<string | null>;
	/** Whether each package can be installed for this component today. */
	availability: PerFramework<Availability>;
	/** The HTML docs page (all three frameworks). */
	url: string;
	props: NonNullable<ComponentMeta["props"]>;
	snippets: NonNullable<ComponentMeta["slots"]>;
	events: NonNullable<ComponentMeta["events"]>;
	/** Titles of the Svelte docs examples (on the Svelte Markdown page). */
	examples: string[];
}

export interface RegistryJson {
	name: "fancy-ui";
	/** Shape version: 2 groups every per-package fact by framework. */
	version: 2;
	homepage: string;
	llms: string;
	packages: PerFramework<RegistryPackage>;
	count: number;
	components: RegistryEntry[];
	/** Composed patterns, each with its Markdown page. */
	recipes: { slug: string; title: string; url: string }[];
}

const PACKAGE_NAMES: PerFramework<string> = {
	svelte: FRAMEWORK_DOCS.svelte.package,
	react: FRAMEWORK_DOCS.react.package,
	vue: FRAMEWORK_DOCS.vue.package,
};

const COPY_INDEXES: PerFramework<string> = {
	svelte: `${REGISTRY_BASE_SVELTE}/registry.json`,
	react: `${REGISTRY_BASE}/registry.json`,
	vue: `${REGISTRY_BASE_VUE}/registry.json`,
};

function perFramework<T>(value: (framework: DocsFramework) => T): PerFramework<T> {
	return Object.fromEntries(FRAMEWORKS.map((fw) => [fw, value(fw)])) as PerFramework<T>;
}

/**
 * Every component as JSON, served at /registry.json. Version 2 describes the
 * project rather than one package: each per-package fact (imports, Markdown
 * page, copy source, availability) is keyed by framework.
 */
export function generateRegistryJson(): RegistryJson {
	const components = [...byCategory(doneComponents()).values()].flat().map((c): RegistryEntry => {
		const copy = copySourcesFor(c.slug);
		return {
			name: c.name,
			slug: c.slug,
			description: c.description,
			category: c.category,
			group: c.group,
			tags: c.tags ?? [],
			dependencies: c.dependencies ?? [],
			imports: perFramework((fw) => {
				const names = importNamesFor(c, fw);
				return names ? { package: PACKAGE_NAMES[fw], names } : null;
			}),
			docs: perFramework((fw) => (importNamesFor(c, fw) ? markdownUrl(c, fw) : null)),
			copySource: perFramework((fw) => copy[fw]?.url ?? null),
			availability: perFramework((fw) => variantFor(c.slug, fw).availability),
			url: docsUrl(c),
			props: c.props ?? [],
			snippets: c.slots ?? [],
			events: c.events ?? [],
			examples: exampleSources(c.slug).map((e) => e.title),
		};
	});
	return {
		name: "fancy-ui",
		version: 2,
		homepage: SITE_URL,
		llms: `${SITE_URL}/llms.txt`,
		packages: perFramework((fw) => ({
			name: PACKAGE_NAMES[fw],
			install: `npm install ${PACKAGE_NAMES[fw]}`,
			registry: COPY_INDEXES[fw],
		})),
		count: components.length,
		components,
		recipes: recipesRegistry.map((r) => ({
			slug: r.slug,
			title: r.title,
			url: recipeMarkdownUrl(r.slug),
		})),
	};
}
