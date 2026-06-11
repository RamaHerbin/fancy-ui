<script lang="ts">
	import { BorderBeam, type BorderBeamProps } from "$lib/fancy-ui/border-beam";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<PropsPlayground
	controls={[
		{ key: "size", type: "range", label: "Size", min: 50, max: 500, step: 10 },
		{ key: "duration", type: "range", label: "Duration (s)", min: 1, max: 60 },
		{ key: "borderWidth", type: "range", label: "Border Width", min: 0.5, max: 8, step: 0.5 },
		{ key: "anchor", type: "range", label: "Anchor", min: 0, max: 100 },
		{ key: "colorFrom", type: "color", label: "Color From" },
		{ key: "colorTo", type: "color", label: "Color To" },
		{ key: "delay", type: "number", label: "Delay (s)", min: 0 },
	]}
	initialValues={{
		size: 200,
		duration: 15,
		borderWidth: 1.5,
		anchor: 90,
		colorFrom: "#ffaa40",
		colorTo: "#9c40ff",
		delay: 0,
	}}
>
	{#snippet preview(values)}
		<div class="bg-background relative h-40 w-full max-w-md overflow-hidden rounded-xl border p-6">
			<p class="text-muted-foreground text-center">Preview</p>
			<BorderBeam {...values as BorderBeamProps} />
		</div>
	{/snippet}
</PropsPlayground>
