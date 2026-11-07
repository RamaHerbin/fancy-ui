import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

/** The playground's starting values; `fluidColor` has no component default and is always written. */
export const INITIAL: Record<string, PlaygroundScalar> = {
	splatRadius: 0.2,
	splatForce: 6000,
	densityDissipation: 3.5,
	velocityDissipation: 2,
	curl: 3,
	pressure: 0.1,
	shading: true,
	colorIntensity: 0.15,
	colorUpdateSpeed: 10,
	fluidColor: "#8ec5ff",
	autoSplat: false,
	autoSplatInterval: 1500,
	hdr: false,
	dither: false,
	ditherPixelSize: 3,
	ditherLevels: 4,
};

/**
 * The usage per framework: the fluid fills its host (`contained` is on by
 * default), so the export carries a sized, relatively positioned host or the
 * copied example collapses to nothing.
 */
export function fluidCursorCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [];
	for (const [name, initial] of Object.entries(INITIAL)) {
		const value = values[name];
		if (value === undefined) continue;
		if (name !== "fluidColor" && value === initial) continue;
		attrs.push(attribute(name, value, framework));
	}
	const props = attrs.map((a) => `\n\t\t${a}`).join("");
	const host = framework === "react" ? 'className="relative h-64"' : 'class="relative h-64"';
	return `<div ${host}>
	<FluidCursor${props}
	/>
</div>`;
}
