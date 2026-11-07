import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

/**
 * The usage per framework: the starfield fills its host (`size-full`, star
 * layers positioned absolutely), so without an explicit height it collapses
 * to nothing. The export carries the sized class and the overlay content the
 * preview shows.
 */
export function bgStarsCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [];
	for (const name of ["factor", "speed", "stiffness", "damping"])
		if (typeof values[name] === "number") attrs.push(attribute(name, values[name], framework));
	if (values.starColor && values.starColor !== "#ffffff")
		attrs.push(attribute("starColor", String(values.starColor), framework));
	const props = attrs.map((a) => `\n\t${a}`).join("");
	const classAttr =
		framework === "react" ? 'className="h-64 bg-[#0b0b0c]"' : 'class="h-64 bg-[#0b0b0c]"';
	const inner =
		framework === "react"
			? `<div className="relative z-10 flex h-full items-center justify-center">
		<p className="text-xl font-semibold text-white">Move your pointer</p>
	</div>`
			: `<div class="relative z-10 flex h-full items-center justify-center">
		<p class="text-xl font-semibold text-white">Move your pointer</p>
	</div>`;
	return `<StarsBackground
	${classAttr}${props}
>
	${inner}
</StarsBackground>`;
}
