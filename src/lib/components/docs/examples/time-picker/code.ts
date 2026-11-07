import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

/**
 * The usage per framework: the selected time is bound state. The bounds are
 * written only when set, since the component leaves them open. The label has
 * no default and is always written.
 */
export function timePickerCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [];
	if (values.label) attrs.push(attribute("label", String(values.label), framework));
	if (values.placeholder && values.placeholder !== "Select a time")
		attrs.push(attribute("placeholder", String(values.placeholder), framework));
	if (typeof values.step === "number" && values.step !== 30)
		attrs.push(attribute("step", values.step, framework));
	if (values.min) attrs.push(attribute("min", String(values.min), framework));
	if (values.max) attrs.push(attribute("max", String(values.max), framework));
	if (values.hour12 === true) attrs.push("hour12");
	if (values.locale) attrs.push(attribute("locale", String(values.locale), framework));
	for (const flag of ["disabled", "required", "invalid", "sound"])
		if (values[flag] === true) attrs.push(flag);

	const lines = (...first: string[]) => [...first, ...attrs].map((a) => `\n\t${a}`).join("");

	if (framework === "vue") {
		return `<script setup lang="ts">
import { ref } from "vue";

const time = ref<string | null>(null);
</script>

<TimePicker${lines('v-model:value="time"')}
/>`;
	}
	if (framework === "react") {
		return `const [time, setTime] = useState<string | null>(null);

<TimePicker${lines(`value={time}`, `onValueChange={setTime}`)}
/>`;
	}
	return `<script lang="ts">
let time = $state<string | null>(null);
</script>

<TimePicker${lines(`bind:value={time}`)}
/>`;
}
