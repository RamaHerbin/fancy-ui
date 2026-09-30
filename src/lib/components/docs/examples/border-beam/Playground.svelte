<script lang="ts">
	import { BorderBeam, type BorderBeamProps } from "$lib/fancy-ui/border-beam";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<PropsPlayground
	controls={[
		{ key: "tail", type: "range", label: "Tail", min: 0.05, max: 1, step: 0.05 },
		{ key: "glow", type: "range", label: "Glow", min: 0, max: 1, step: 0.05 },
		{ key: "reverse", type: "boolean", label: "Reverse" },
		{ key: "size", type: "range", label: "Size", min: 50, max: 500, step: 10 },
		{ key: "duration", type: "range", label: "Duration (s)", min: 1, max: 60 },
		{ key: "borderWidth", type: "range", label: "Border Width", min: 0.5, max: 8, step: 0.5 },
		{ key: "anchor", type: "range", label: "Anchor", min: 0, max: 100 },
		{ key: "colorFrom", type: "color", label: "Color From" },
		{ key: "colorTo", type: "color", label: "Color To" },
		{ key: "delay", type: "number", label: "Delay (s)", min: 0 },
	]}
	initialValues={{
		tail: 0.25,
		glow: 0.6,
		reverse: false,
		size: 200,
		duration: 9,
		borderWidth: 1.5,
		anchor: 90,
		colorFrom: "#8ec5ff",
		colorTo: "#c084fc",
		delay: 0,
	}}
>
	{#snippet preview(values)}
		<div
			class="relative flex h-40 w-[28rem] max-w-[80vw] items-center justify-center overflow-hidden rounded-xl border border-black/[0.08] bg-[#fafafa] p-6 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
		>
			<p class="font-mono text-xs text-neutral-500">Preview</p>
			<BorderBeam {...values as BorderBeamProps} />
		</div>
	{/snippet}
</PropsPlayground>
