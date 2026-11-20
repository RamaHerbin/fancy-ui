import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

function tag(name: string, attrs: string[]): string {
	const inline = `<${[name, ...attrs].join(" ")}>`;
	if (inline.length <= 72) return inline;
	return `<${name}${attrs.map((a) => `\n\t${a}`).join("")}\n>`;
}

/**
 * The usage per framework: a group only joins the buttons placed inside it,
 * so the export carries three of them. The label has no default and is
 * always written.
 */
export function buttonGroupCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [];
	if (values.orientation && values.orientation !== "horizontal")
		attrs.push(attribute("orientation", String(values.orientation), framework));
	if (values.label) attrs.push(attribute("label", String(values.label), framework));
	return `${tag("ButtonGroup", attrs)}
	<Button variant="outline">Cut</Button>
	<Button variant="outline">Copy</Button>
	<Button variant="outline">Paste</Button>
</ButtonGroup>`;
}
