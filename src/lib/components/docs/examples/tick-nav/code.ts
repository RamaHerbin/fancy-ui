import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

/** The items the playground renders, written into the usage so the copy stands on its own. */
export const DATA = `const items = [
	{ id: "signal", label: "01 Signal" },
	{ id: "noise", label: "02 Noise" },
	{ id: "pulse", label: "03 Pulse" },
	{ id: "drift", label: "04 Drift", badge: "New" },
	{ id: "echo", label: "05 Echo" },
];`;

/**
 * The usage per framework: the nav needs its `items` and a current id, which
 * live outside the playground's controls, so the export carries the item
 * definitions and the bound value.
 */
export function tickNavCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [];
	if (values.variant && values.variant !== "default")
		attrs.push(attribute("variant", String(values.variant), framework));
	if (typeof values.reach === "number") attrs.push(attribute("reach", values.reach, framework));
	if (typeof values.minorTicks === "number")
		attrs.push(attribute("minorTicks", values.minorTicks, framework));
	if (values.hdr === false) attrs.push(attribute("hdr", false, framework));
	if (values.sound === true) attrs.push("sound");
	if (values.ariaLabel) attrs.push(attribute("ariaLabel", String(values.ariaLabel), framework));
	const props = attrs.map((a) => `\n\t${a}`).join("");
	if (framework === "vue") {
		return `<script setup lang="ts">
import { ref } from "vue";

${DATA}

const value = ref("pulse");
</script>

<TickNav :items="items" v-model:value="value"${props} />`;
	}
	if (framework === "react") {
		return `${DATA}

const [value, setValue] = useState("pulse");

<TickNav items={items} value={value} onValueChange={setValue}${props} />`;
	}
	return `<script lang="ts">
${DATA}

let value = $state("pulse");
</script>

<TickNav {items} bind:value${props} />`;
}
