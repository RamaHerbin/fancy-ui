import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

/**
 * The usage per framework: the selected date is bound state, and the week
 * start control holds a string while the prop is the number 0 or 1, so the
 * export converts it. The label has no default and is always written.
 */
export function datePickerCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [];
	if (values.label) attrs.push(attribute("label", String(values.label), framework));
	if (values.placeholder && values.placeholder !== "Pick a date")
		attrs.push(attribute("placeholder", String(values.placeholder), framework));
	const week = Number(values.weekStartsOn);
	if (week === 0) attrs.push(attribute("weekStartsOn", 0, framework));
	if (values.locale) attrs.push(attribute("locale", String(values.locale), framework));
	for (const flag of ["disabled", "required", "invalid", "sound"])
		if (values[flag] === true) attrs.push(flag);

	const lines = (...first: string[]) => [...first, ...attrs].map((a) => `\n\t${a}`).join("");

	if (framework === "vue") {
		return `<script setup lang="ts">
import { ref } from "vue";

const date = ref<Date | null>(null);
</script>

<DatePicker${lines('v-model:value="date"')}
/>`;
	}
	if (framework === "react") {
		return `const [date, setDate] = useState<Date | null>(null);

<DatePicker${lines(`value={date}`, `onValueChange={setDate}`)}
/>`;
	}
	return `<script lang="ts">
let date = $state<Date | null>(null);
</script>

<DatePicker${lines(`bind:value={date}`)}
/>`;
}
