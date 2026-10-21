import { attribute, vueAttributeString, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

/** A toast is a function call plus one Toaster, so the code is not a single tag. */
export function toastCode(values: Record<string, PlaygroundScalar>, framework: Framework): string {
	const mount =
		values.position === "bottom-right"
			? "<Toaster />"
			: `<Toaster ${attribute("position", String(values.position), framework)} />`;
	// The Vue handler sits inside a double-quoted attribute: single-quoted strings, entities for the rest.
	const str = (value: unknown) =>
		framework === "vue" ? vueAttributeString(String(value)) : JSON.stringify(String(value));
	const call = `toast({
	title: ${str(values.title)},
	description: ${str(values.description)},
	variant: ${str(values.variant)},
})`;
	if (framework === "react") {
		return `${mount}
<Button onClick={() => ${call}}>Show toast</Button>`;
	}
	if (framework === "vue") {
		return `${mount}
<Button @click="${call}">Show toast</Button>`;
	}
	return `${mount}
<Button onclick={() => ${call}}>Show toast</Button>`;
}
