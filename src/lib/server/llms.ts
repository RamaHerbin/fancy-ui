/**
 * llms.txt generators
 *
 * Builds LLM-friendly plain-text documentation from the component registry,
 * served at /llms.txt (index) and /llms-full.txt (full reference).
 * Follows the https://llmstxt.org convention.
 */

import { registry, categories, categoryLabels } from "$lib/fancy-ui/registry.js";
import type { ComponentMeta } from "$lib/types.js";

const SITE_URL = "https://fancy-ui.rama.app";

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

function importNames(component: ComponentMeta): string[] {
	const exported = exportsBySlug.get(component.slug) ?? [];
	if (exported.includes(component.name)) return [component.name];
	return exported.length > 0 ? exported : [component.name];
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

function docsUrl(component: ComponentMeta): string {
	return `${SITE_URL}/docs/components/${component.slug}`;
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
  may not — only pass \`class\` when it appears in the component's props table.`;

function header(componentCount: number): string {
	return `# fancy-ui-svelte

> ${componentCount} animated UI components for Svelte 5 + Tailwind CSS v4: buttons, cards, text effects, backgrounds, cursors, and layout primitives. MIT licensed. Install with \`npm install fancy-ui-svelte\`, import from \`'fancy-ui-svelte'\`.

Docs: ${SITE_URL}/docs — Source: https://github.com/RamaHerbin/fancy-ui`;
}

/**
 * Short index version, served at /llms.txt
 */
export function generateLlmsTxt(): string {
	const components = doneComponents();
	const lines: string[] = [header(components.length), "", USAGE_GUIDE, "", "## Components", ""];

	for (const [category, items] of byCategory(components)) {
		lines.push(`### ${categoryLabels[category as keyof typeof categoryLabels]}`, "");
		for (const c of items) {
			lines.push(`- [${c.name}](${docsUrl(c)}): ${c.description}`);
		}
		lines.push("");
	}

	lines.push(
		"## Full reference",
		"",
		`- [llms-full.txt](${SITE_URL}/llms-full.txt): every component with its complete props table`,
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

/**
 * Full reference version, served at /llms-full.txt
 */
export function generateLlmsFullTxt(): string {
	const components = doneComponents();
	const lines: string[] = [header(components.length), "", USAGE_GUIDE, ""];

	for (const [category, items] of byCategory(components)) {
		lines.push(`## ${categoryLabels[category as keyof typeof categoryLabels]}`, "");
		for (const c of items) {
			lines.push(`### ${c.name}`, "", `${c.description}.`, "");
			lines.push(
				`\`\`\`ts`,
				`import { ${importNames(c).join(", ")} } from 'fancy-ui-svelte';`,
				`\`\`\``
			);
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
			lines.push("", `Docs: ${docsUrl(c)}`, "");
		}
	}

	return lines.join("\n");
}
