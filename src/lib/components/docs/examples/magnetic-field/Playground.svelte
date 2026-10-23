<script lang="ts">
	import {
		MagneticField,
		MagneticItem,
		MagnetPuck,
		type MagneticSpringPreset,
	} from "$lib/fancy-ui/magnetic-field";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";

	const chips = [
		{ label: "Light", mass: 0.6 },
		{ label: "Medium", mass: 1 },
		{ label: "Heavy", mass: 2.5 },
	];
</script>

<PropsPlayground
	controls={[
		{ key: "radius", type: "range", label: "Radius", min: 60, max: 400, step: 10 },
		{ key: "strength", type: "range", label: "Strength", min: 0, max: 2, step: 0.1 },
		{ key: "maxTranslate", type: "range", label: "Max travel", min: 0, max: 64, step: 2 },
		{ key: "maxRotate", type: "range", label: "Max lean", min: 0, max: 15, step: 0.5 },
		{
			key: "spring",
			type: "select",
			label: "Spring",
			options: [
				{ value: "soft", label: "Soft" },
				{ value: "default", label: "Default" },
				{ value: "snappy", label: "Snappy" },
			],
		},
		{
			key: "polarity",
			type: "select",
			label: "Polarity",
			options: [
				{ value: "1", label: "Attract" },
				{ value: "-1", label: "Repel" },
			],
		},
		{ key: "sticky", type: "boolean", label: "Sticky puck" },
		{ key: "disabled", type: "boolean", label: "Disabled" },
	]}
	initialValues={{
		radius: 220,
		strength: 1,
		maxTranslate: 24,
		maxRotate: 6,
		spring: "default",
		polarity: "1",
		sticky: false,
		disabled: false,
	}}
>
	{#snippet preview(values)}
		<MagneticField
			radius={values.radius as number}
			strength={values.strength as number}
			maxTranslate={values.maxTranslate as number}
			maxRotate={values.maxRotate as number}
			spring={values.spring as MagneticSpringPreset}
			polarity={values.polarity === "-1" ? -1 : 1}
			disabled={values.disabled as boolean}
			class="mx-auto w-full max-w-lg px-4 pt-20 pb-8"
		>
			<div class="bg-card mx-auto max-w-sm rounded-2xl border p-8">
				<div class="flex flex-wrap gap-3">
					{#each chips as chip (chip.label)}
						<MagneticItem inline mass={chip.mass}>
							<span class="bg-muted inline-block rounded-full px-3 py-1 text-sm">
								{chip.label} · {chip.mass}
							</span>
						</MagneticItem>
					{/each}
				</div>
				<MagneticItem mass={1.2} class="mt-6 w-fit">
					<p class="text-2xl font-semibold tracking-tight">Tune the field</p>
				</MagneticItem>
				<MagneticItem mass={2.5}>
					<p class="text-muted-foreground mt-3 text-sm">
						Move a mouse near the card, or pick up the magnet. Change a control while the items are
						still moving: the springs keep their speed.
					</p>
				</MagneticItem>
			</div>
			<MagnetPuck
				position={{ x: 40, y: 40 }}
				sticky={values.sticky as boolean}
				label="Magnet: drag it toward the card"
			/>
		</MagneticField>
	{/snippet}
</PropsPlayground>
