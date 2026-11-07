<script lang="ts">
	import { StickyScroll } from "$lib/fancy-ui/sticky-scroll";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
	import { stickyScrollCode } from "./code.js";

	interface Step {
		title: string;
		body: string;
		gradient: string;
	}

	const steps: Step[] = [
		{ title: "Compose", body: "Start from a blank canvas.", gradient: "from-sky-400 to-blue-600" },
		{ title: "Review", body: "A quiet second pass.", gradient: "from-violet-400 to-purple-600" },
		{ title: "Send", body: "One click hands it over.", gradient: "from-emerald-400 to-teal-600" },
	];
</script>

<PropsPlayground
	component="StickyScroll"
	slug="sticky-scroll"
	codeFor={stickyScrollCode}
	constraints={["Give it a tall column of items, the panel sticks while they scroll past."]}
	controls={[
		{
			key: "panelSide",
			type: "select",
			label: "Panel side",
			options: [
				{ value: "end", label: "end" },
				{ value: "start", label: "start" },
			],
		},
		{ key: "crossfade", type: "boolean", label: "Crossfade" },
		{ key: "panelHidden", type: "boolean", label: "Panel aria-hidden" },
	]}
	initialValues={{ panelSide: "end", crossfade: true, panelHidden: true }}
>
	{#snippet preview(values)}
		<div
			class="relative w-[36rem] max-w-[85vw] overflow-clip rounded-xl border border-black/[0.08] bg-[#fafafa] p-4 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
		>
			<StickyScroll
				items={steps}
				panelSide={values.panelSide as "start" | "end"}
				crossfade={values.crossfade as boolean}
				panelHidden={values.panelHidden as boolean}
			>
				{#snippet item(step, _index, active)}
					<div
						class="flex min-h-[14rem] flex-col justify-center gap-2 transition-opacity duration-300"
						class:opacity-40={!active}
					>
						<h3 class="text-xl font-semibold">{step.title}</h3>
						<p class="text-sm text-neutral-500">{step.body}</p>
					</div>
				{/snippet}
				{#snippet panel(step)}
					<div
						class="flex h-48 w-full items-center justify-center rounded-xl bg-gradient-to-br {step.gradient}"
					>
						<span class="text-xl font-semibold text-white/90">{step.title}</span>
					</div>
				{/snippet}
			</StickyScroll>
			<p class="mt-3 text-xs text-neutral-500">
				Scroll the page, the panel follows the centred step.
			</p>
		</div>
	{/snippet}
</PropsPlayground>
