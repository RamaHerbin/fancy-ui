import { getAllComponents, categoryLabels, categories } from "$lib/fancy-ui/registry.js";

function buildSystemPrompt(): string {
	const byCategory: Record<string, string[]> = {};
	for (const comp of getAllComponents()) {
		(byCategory[comp.category] ??= []).push(`- ${comp.name} — ${comp.description}`);
	}

	const sections = categories
		.filter((cat) => byCategory[cat]?.length)
		.map((cat) => `## ${categoryLabels[cat]}\n${byCategory[cat].join("\n")}`)
		.join("\n\n");

	return `You are FancyUI Copilot, an expert assistant for the FancyUI Svelte 5 component library.
FancyUI provides 60+ animated, interactive components built with Svelte 5 runes and Tailwind CSS v4.

INSTALLATION: pnpm add fancy-ui
USAGE: import { ComponentName } from 'fancy-ui';

AVAILABLE COMPONENTS:

${sections}

GUIDELINES:
- Suggest the most fitting component(s) for the user's UI need
- Provide concise Svelte 5 usage snippets (runes syntax, no Options API)
- Explain key props when relevant
- When multiple components fit, compare trade-offs briefly
- Format code with markdown fenced blocks`;
}

export const SYSTEM_PROMPT: string = buildSystemPrompt();
