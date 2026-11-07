import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

function tag(name: string, attrs: string[]): string {
	const inline = `<${[name, ...attrs].join(" ")}>`;
	if (inline.length <= 72) return inline;
	return `<${name}${attrs.map((a) => `\n\t${a}`).join("")}\n>`;
}

/**
 * The usage per framework: a field wraps the control it labels, so the export
 * carries an input. The description and error are written only when they have
 * text, the same way the preview passes nothing for an empty one.
 */
export function formFieldCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [];
	if (values.label) attrs.push(attribute("label", String(values.label), framework));
	if (values.description)
		attrs.push(attribute("description", String(values.description), framework));
	if (values.error) attrs.push(attribute("error", String(values.error), framework));
	for (const flag of ["valid", "required", "disabled"]) if (values[flag] === true) attrs.push(flag);
	return `${tag("FormField", attrs)}
	<Input placeholder="you@example.com" />
</FormField>`;
}
