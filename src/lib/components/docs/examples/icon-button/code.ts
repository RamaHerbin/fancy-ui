import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

const DEFAULTS: Record<string, PlaygroundScalar> = {
	variant: "outline",
	size: "md",
	shape: "square",
};

function tag(name: string, attrs: string[]): string {
	const inline = `<${[name, ...attrs].join(" ")}>`;
	if (inline.length <= 72) return inline;
	return `<${name}${attrs.map((a) => `\n\t${a}`).join("")}\n>`;
}

/**
 * The usage per framework: the icon is the button's only content, so the
 * export carries one. The label is required (it is the accessible name) and
 * always written.
 */
export function iconButtonCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [attribute("label", String(values.label ?? ""), framework)];
	for (const [name, fallback] of Object.entries(DEFAULTS)) {
		const value = values[name];
		if (value !== undefined && value !== fallback) attrs.push(attribute(name, value, framework));
	}
	for (const flag of ["disabled", "loading", "sound"]) if (values[flag] === true) attrs.push(flag);

	const react = framework === "react";
	const svg = `<svg
		${react ? "className" : "class"}="size-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		${react ? "strokeWidth" : "stroke-width"}=${react ? "{2}" : '"2"'}
		${react ? "strokeLinecap" : "stroke-linecap"}="round"
		${react ? "strokeLinejoin" : "stroke-linejoin"}="round"
		aria-hidden="true"
	>
		<path d="M12 20s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 5c-2.5 4.65-9.5 9-9.5 9Z" />
	</svg>`;
	return `${tag("IconButton", attrs)}
	${svg}
</IconButton>`;
}
