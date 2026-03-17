import { getAllComponents, categoryLabels } from "$lib/fancy-ui/registry.js";
import type { ComponentCategory } from "$lib/types.js";

const SITE_URL = "https://fancy-ui.rama.app";
const GITHUB_URL = "https://github.com/RamaHerbin/fancy-ui";

export async function GET() {
	const components = getAllComponents().filter((c) => c.status === "done");

	// Group by category
	const grouped = new Map<ComponentCategory, typeof components>();
	for (const c of components) {
		if (!grouped.has(c.category)) grouped.set(c.category, []);
		grouped.get(c.category)!.push(c);
	}

	const categoryOrder: ComponentCategory[] = [
		"effects",
		"buttons",
		"cards",
		"text",
		"backgrounds",
		"layout",
		"navigation",
		"data-display",
		"feedback",
		"media",
	];

	const componentSections = categoryOrder
		.filter((cat) => grouped.has(cat))
		.map((cat) => {
			const items = grouped.get(cat)!;
			const header = `## ${categoryLabels[cat]}`;
			const list = items
				.map((c) => `- [${c.name}](${SITE_URL}/demo/${c.slug}): ${c.description}`)
				.join("\n");
			return `${header}\n\n${list}`;
		})
		.join("\n\n");

	const content = `# FancyUI

> 50+ animated, beautiful UI components for Svelte 5. Built with Tailwind CSS v4 and TypeScript. Free and open source under the MIT license.

FancyUI is a Svelte 5 component library focused on animated and interactive UI elements. Components are inspired by Aceternity UI, Magic UI, and Inspira UI, re-implemented natively in Svelte 5 using runes ($state, $derived, $effect), with no React or Vue dependency.

## Key facts

- Framework: Svelte 5 (runes API)
- Styling: Tailwind CSS v4
- Language: TypeScript
- License: MIT
- Repository: ${GITHUB_URL}
- Live demo: ${SITE_URL}
- Component count: ${components.length}+

## Installation

Clone the repository and copy any component you need directly into your project — no npm package required yet (coming in v0.2).

\`\`\`bash
git clone ${GITHUB_URL}
\`\`\`

Then import any component:

\`\`\`svelte
import { Meteors, BorderBeam, Marquee } from '$lib/fancy-ui';
\`\`\`

## Components

${componentSections}

## Optional: full component list with descriptions

All components are available at ${SITE_URL}/demo with live interactive previews.
`;

	return new Response(content, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "max-age=3600",
		},
	});
}
