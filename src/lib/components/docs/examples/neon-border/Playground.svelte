<script lang="ts">
	import { NeonBorder } from "$lib/fancy-ui/neon-border";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<PropsPlayground
	controls={[
		{ key: "color1", type: "color", label: "Color 1" },
		{ key: "color2", type: "color", label: "Color 2" },
		{
			key: "animationType",
			type: "select",
			label: "Animation Type",
			options: [
				{ value: "none", label: "None (static)" },
				{ value: "half", label: "Half" },
				{ value: "full", label: "Full" },
			],
		},
		{ key: "duration", type: "range", label: "Duration (s)", min: 1, max: 20, step: 1 },
	]}
	initialValues={{ color1: "#0496ff", color2: "#ff0a54", animationType: "half", duration: 6 }}
>
	{#snippet preview(values)}
		<div class="flex items-center justify-center py-8">
			<NeonBorder
				color1={values.color1 as string}
				color2={values.color2 as string}
				animationType={values.animationType as "none" | "half" | "full"}
				duration={values.duration as number}
			>
				<div
					class="bg-background flex h-full w-full items-center justify-center rounded-lg px-8 py-3"
				>
					<span class="font-medium">Neon Border</span>
				</div>
			</NeonBorder>
		</div>
	{/snippet}
</PropsPlayground>
