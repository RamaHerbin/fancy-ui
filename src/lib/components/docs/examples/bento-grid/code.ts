import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

function tag(name: string, attrs: string[]): string {
	const inline = `<${[name, ...attrs].join(" ")}>`;
	if (inline.length <= 72) return inline;
	return `<${name}${attrs.map((a) => `\n\t${a}`).join("")}\n>`;
}

const TILES = [
	{ title: "Latency, at a glance", text: "Every request, folded into one quiet line.", wide: true },
	{ title: "Deploy queue", text: "Ship in order, roll back in one move.", wide: false },
	{ title: "Uptime", text: "One amber day in twenty.", wide: false },
];

/**
 * The usage per framework: a grid is only its tiles, and each tile fills
 * named slots (snippets in Svelte, props in React, slots in Vue), so the
 * export carries the three tiles the preview renders. The accent is always
 * written because the component has none of its own.
 */
export function bentoGridCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [];
	if (values.reveal === false) attrs.push(attribute("reveal", false, framework));
	attrs.push(attribute("accent", String(values.accent), framework));
	const root = tag("BentoGrid", attrs);

	const items = TILES.map((tile) => {
		if (framework === "react") {
			const cls = tile.wide ? `\n\t\tclassName="md:col-span-2"` : "";
			return `\t<BentoGridItem${cls}\n\t\ttitle="${tile.title}"\n\t\tdescription="${tile.text}"\n\t/>`;
		}
		const cls = tile.wide ? ` class="md:col-span-2"` : "";
		if (framework === "vue") {
			return `\t<BentoGridItem${cls}>\n\t\t<template #title>${tile.title}</template>\n\t\t<template #description>${tile.text}</template>\n\t</BentoGridItem>`;
		}
		return `\t<BentoGridItem${cls}>\n\t\t{#snippet title()}${tile.title}{/snippet}\n\t\t{#snippet description()}${tile.text}{/snippet}\n\t</BentoGridItem>`;
	});
	return `${root}\n${items.join("\n")}\n</BentoGrid>`;
}
