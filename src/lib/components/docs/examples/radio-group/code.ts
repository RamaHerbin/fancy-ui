import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

/**
 * The usage per framework: a group is its items plus a bound selection, so
 * the export carries three items and the state that holds the choice. The
 * label has no default and is always written.
 */
export function radioGroupCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [];
	if (values.orientation && values.orientation !== "vertical")
		attrs.push(attribute("orientation", String(values.orientation), framework));
	if (values.label) attrs.push(attribute("label", String(values.label), framework));
	for (const flag of ["disabled", "required", "invalid", "sound"])
		if (values[flag] === true) attrs.push(flag);
	const lines = (...first: string[]) => [...first, ...attrs].map((a) => `\n\t${a}`).join("");
	const items = `	<RadioGroupItem value="a" label="Option A" />
	<RadioGroupItem value="b" label="Option B" />
	<RadioGroupItem value="c" label="Option C" />`;

	if (framework === "vue") {
		return `<script setup lang="ts">
import { ref } from "vue";

const plan = ref("a");
</script>

<RadioGroup${lines('v-model:value="plan"')}
>
${items}
</RadioGroup>`;
	}
	if (framework === "react") {
		return `const [plan, setPlan] = useState("a");

<RadioGroup${lines("value={plan}", "onValueChange={setPlan}")}
>
${items}
</RadioGroup>`;
	}
	return `<script lang="ts">
let plan = $state("a");
</script>

<RadioGroup${lines("bind:value={plan}")}
>
${items}
</RadioGroup>`;
}
