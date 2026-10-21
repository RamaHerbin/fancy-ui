import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

const optionsCode = `const frameworks = [
	{ value: "svelte", label: "Svelte 5" },
	{ value: "react", label: "React" },
	{ value: "vue", label: "Vue" },
];`;

/** The options list and the selected value live next to the tag, so the code shows them. */
export function selectCode(values: Record<string, PlaygroundScalar>, framework: Framework): string {
	const attrs = (binding: string, list: string) =>
		[
			binding,
			list,
			attribute("label", String(values.label), framework),
			attribute("placeholder", String(values.placeholder), framework),
			values.disabled ? "disabled" : "",
		]
			.filter(Boolean)
			.map((a) => `\t${a}`)
			.join("\n");
	if (framework === "react") {
		return `${optionsCode}

<Select
${attrs("value={framework}\n\tonValueChange={setFramework}", "options={frameworks}")}
/>`;
	}
	if (framework === "vue") {
		return `${optionsCode}

<Select
${attrs('v-model:value="framework"', ':options="frameworks"')}
/>`;
	}
	return `${optionsCode}

<Select
${attrs("bind:value={framework}", "options={frameworks}")}
/>`;
}
