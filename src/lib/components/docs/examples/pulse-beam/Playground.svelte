<script lang="ts">
	import { PulseBeam, type PulseBeamProps } from "$lib/fancy-ui/pulse-beam";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<PropsPlayground
	controls={[
		{
			key: "variant",
			type: "select",
			label: "Type",
			options: [
				{ value: "inner", label: "Pulse inner" },
				{ value: "outside", label: "Pulse outside" },
			],
		},
		{
			key: "palette",
			type: "select",
			label: "Color",
			options: [
				{ value: "colorful", label: "Colorful" },
				{ value: "mono", label: "Mono" },
				{ value: "ocean", label: "Ocean" },
				{ value: "sunset", label: "Sunset" },
			],
		},
		{ key: "strength", type: "range", label: "Strength", min: 0, max: 1, step: 0.05 },
		{ key: "speed", type: "range", label: "Speed", min: 0.25, max: 3, step: 0.25 },
		{ key: "radius", type: "range", label: "Radius", min: 0, max: 40, step: 2 },
		{ key: "active", type: "boolean", label: "Active" },
		{ key: "hueShift", type: "boolean", label: "Hue drift" },
		{
			key: "tone",
			type: "select",
			label: "Tone",
			options: [
				{ value: "dark", label: "Dark surface" },
				{ value: "light", label: "Light surface" },
			],
		},
	]}
	initialValues={{
		variant: "inner",
		palette: "colorful",
		strength: 0.7,
		speed: 1,
		radius: 16,
		active: true,
		hueShift: true,
		tone: "dark",
	}}
>
	{#snippet preview(values)}
		<div class="py-8">
			<PulseBeam {...values as PulseBeamProps} class="mx-auto w-full max-w-md">
				<div class="bg-card p-5" style:border-radius="{values.radius}px">
					<p class="text-muted-foreground text-sm">Build anything…</p>
					<p class="mt-6 text-sm">
						Drag the controls — the loop keeps running, only the look changes.
					</p>
				</div>
			</PulseBeam>
		</div>
	{/snippet}
</PropsPlayground>
