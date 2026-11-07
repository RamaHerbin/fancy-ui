import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

const DEFAULTS: Record<string, PlaygroundScalar> = {
	rotate: "y",
	trigger: "hover",
	duration: 700,
	glare: true,
};

function tag(name: string, attrs: string[]): string {
	const inline = `<${[name, ...attrs].join(" ")}>`;
	if (inline.length <= 72) return inline;
	return `<${name}${attrs.map((a) => `\n\t${a}`).join("")}\n>`;
}

const indent = (text: string, depth: number): string =>
	text
		.split("\n")
		.map((line) => "\t".repeat(depth) + line)
		.join("\n");

/**
 * The usage per framework: a flip card is two faces, the front as children
 * and the back as a `back` snippet, prop or slot, so the export carries both
 * faces. The label has no default and is always written.
 */
export function flipCardCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [];
	for (const [name, fallback] of Object.entries(DEFAULTS)) {
		const value = values[name];
		if (value !== undefined && value !== fallback) attrs.push(attribute(name, value, framework));
	}
	if (values.label) attrs.push(attribute("label", String(values.label), framework));
	const props = attrs.map((a) => `\n\t${a}`).join("");

	const cls = framework === "react" ? "className" : "class";
	const front = `<div ${cls}="flex size-full items-center justify-center bg-gradient-to-br from-amber-300 to-violet-400">
	<p ${cls}="text-2xl font-semibold text-white">Front</p>
</div>`;
	const back = `<div ${cls}="flex size-full flex-col items-center justify-center">
	<p ${cls}="text-lg font-semibold">Back side</p>
	<p ${cls}="mt-2 text-sm text-neutral-500">Hover, focus or tap to flip</p>
</div>`;

	if (framework === "react") {
		return `<FlipCard${props}
	back={
${indent(back, 2)}
	}
>
${indent(front, 1)}
</FlipCard>`;
	}
	const open = tag("FlipCard", attrs);
	if (framework === "vue") {
		return `${open}
${indent(front, 1)}
	<template #back>
${indent(back, 2)}
	</template>
</FlipCard>`;
	}
	return `${open}
${indent(front, 1)}
	{#snippet back()}
${indent(back, 2)}
	{/snippet}
</FlipCard>`;
}
