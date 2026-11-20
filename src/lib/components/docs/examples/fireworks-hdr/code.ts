import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

/** The playground's starting values, equal to the component's defaults. */
export const INITIAL: Record<string, PlaygroundScalar> = {
	hdr: true,
	exposure: 2.2,
	ambient: true,
	ambientIntensity: 0.35,
	interactive: true,
	quality: "auto",
	respectReducedMotion: true,
};

/**
 * The usage per framework: the canvas wrapper is `absolute inset-0`, so the
 * export carries a sized, relatively positioned host or the copied example
 * renders nothing.
 */
export function fireworksHdrCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [];
	for (const [name, initial] of Object.entries(INITIAL)) {
		const value = values[name];
		if (value === undefined || value === initial) continue;
		attrs.push(attribute(name, value, framework));
	}
	const props = attrs.map((a) => `\n\t\t${a}`).join("");
	const host =
		framework === "react" ? 'className="relative h-72 bg-black"' : 'class="relative h-72 bg-black"';
	return `<div ${host}>
	<FireworksHdr${props}${props ? "\n\t" : " "}/>
</div>`;
}
