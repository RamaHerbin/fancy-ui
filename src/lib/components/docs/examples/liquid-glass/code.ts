import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

const DEFAULTS: Record<string, PlaygroundScalar> = {
	radius: 16,
	border: 0.07,
	lightness: 50,
	alpha: 0.93,
	blur: 11,
	frost: 0.05,
	scale: -180,
	rOffset: 0,
	gOffset: 10,
	bOffset: 20,
	blend: "difference",
	xChannel: "R",
	yChannel: "B",
	fallbackBlur: 20,
	fallbackSaturation: 180,
};

/**
 * The usage per framework: the glass wraps content, so the export carries a
 * child; the controls it writes are the ones that differ from the component's
 * own defaults.
 */
export function liquidGlassCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [];
	for (const [name, fallback] of Object.entries(DEFAULTS)) {
		const value = values[name];
		if (value !== undefined && value !== fallback) attrs.push(attribute(name, value, framework));
	}
	const props = attrs.map((a) => `\n\t${a}`).join("");
	const close = props ? "\n>" : ">";
	const cls = framework === "react" ? "className" : "class";
	return `<LiquidGlass${props}${close}
	<div ${cls}="flex min-h-14 items-center justify-center px-10 py-3 text-sm font-medium">
		Liquid glass
	</div>
</LiquidGlass>`;
}
