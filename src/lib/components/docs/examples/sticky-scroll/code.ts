import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

const DATA = `const steps = [
	{ title: "Compose", body: "Start from a blank canvas.", gradient: "from-sky-400 to-blue-600" },
	{ title: "Review", body: "A quiet second pass.", gradient: "from-violet-400 to-purple-600" },
	{ title: "Send", body: "One click hands it over.", gradient: "from-emerald-400 to-teal-600" },
];`;

/**
 * The usage per framework: the component needs its `items` and the two
 * renderers (one row, one panel), which the controls cannot express, so the
 * export carries the data and both renderers.
 */
export function stickyScrollCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [];
	if (values.panelSide && values.panelSide !== "end")
		attrs.push(attribute("panelSide", String(values.panelSide), framework));
	if (values.crossfade === false) attrs.push(attribute("crossfade", false, framework));
	if (values.panelHidden === false) attrs.push(attribute("panelHidden", false, framework));
	const rest = attrs.map((a) => `\n\t${a}`).join("");

	if (framework === "react") {
		return `${DATA}

<StickyScroll
	items={steps}${rest}
	item={(step, _index, active) => (
		<div className={"flex min-h-[14rem] flex-col justify-center gap-2" + (active ? "" : " opacity-40")}>
			<h3 className="text-xl font-semibold">{step.title}</h3>
			<p className="text-sm text-neutral-500">{step.body}</p>
		</div>
	)}
	panel={(step) => (
		<div className={"flex h-48 w-full items-center justify-center rounded-xl bg-gradient-to-br " + step.gradient}>
			<span className="text-xl font-semibold text-white/90">{step.title}</span>
		</div>
	)}
/>`;
	}
	if (framework === "vue") {
		return `<script setup lang="ts">
${DATA}
</script>

<StickyScroll :items="steps"${rest}>
	<template #item="{ item: step, active }">
		<div
			class="flex min-h-[14rem] flex-col justify-center gap-2"
			:class="{ 'opacity-40': !active }"
		>
			<h3 class="text-xl font-semibold">{{ step.title }}</h3>
			<p class="text-sm text-neutral-500">{{ step.body }}</p>
		</div>
	</template>
	<template #panel="{ item: step }">
		<div
			class="flex h-48 w-full items-center justify-center rounded-xl bg-gradient-to-br"
			:class="step.gradient"
		>
			<span class="text-xl font-semibold text-white/90">{{ step.title }}</span>
		</div>
	</template>
</StickyScroll>`;
	}
	return `<script lang="ts">
${DATA}
</script>

<StickyScroll items={steps}${rest}>
	{#snippet item(step, _index, active)}
		<div class="flex min-h-[14rem] flex-col justify-center gap-2" class:opacity-40={!active}>
			<h3 class="text-xl font-semibold">{step.title}</h3>
			<p class="text-sm text-neutral-500">{step.body}</p>
		</div>
	{/snippet}
	{#snippet panel(step)}
		<div class="flex h-48 w-full items-center justify-center rounded-xl bg-gradient-to-br {step.gradient}">
			<span class="text-xl font-semibold text-white/90">{step.title}</span>
		</div>
	{/snippet}
</StickyScroll>`;
}
