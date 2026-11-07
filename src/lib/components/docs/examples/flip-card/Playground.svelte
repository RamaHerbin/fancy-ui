<script lang="ts">
	import { FlipCard, type FlipCardProps } from "$lib/fancy-ui/flip-card";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<PropsPlayground
	component="FlipCard"
	slug="flip-card"
	controls={[
		{
			key: "rotate",
			type: "select",
			label: "Rotate",
			options: [
				{ value: "y", label: "y" },
				{ value: "x", label: "x" },
			],
		},
		{
			key: "trigger",
			type: "select",
			label: "Trigger",
			options: [
				{ value: "hover", label: "hover" },
				{ value: "click", label: "click" },
			],
		},
		{ key: "duration", type: "range", label: "Duration (ms)", min: 200, max: 2000, step: 50 },
		{ key: "glare", type: "boolean", label: "Glare" },
		{ key: "label", type: "text", label: "Label", maxLength: 40 },
	]}
	initialValues={{ rotate: "y", trigger: "hover", duration: 700, glare: true, label: "Flip card" }}
>
	{#snippet preview(values)}
		<FlipCard
			rotate={values.rotate as FlipCardProps["rotate"]}
			trigger={values.trigger as FlipCardProps["trigger"]}
			duration={values.duration as number}
			glare={values.glare as boolean}
			label={values.label as string}
		>
			<div
				class="flex size-full items-center justify-center bg-gradient-to-br from-amber-300 to-violet-400"
			>
				<p class="text-2xl font-semibold text-white">Front</p>
			</div>
			{#snippet back()}
				<div class="flex size-full flex-col items-center justify-center">
					<p class="text-lg font-semibold">Back side</p>
					<p class="mt-2 text-sm text-neutral-500">Hover, focus or tap to flip</p>
				</div>
			{/snippet}
		</FlipCard>
	{/snippet}
</PropsPlayground>
