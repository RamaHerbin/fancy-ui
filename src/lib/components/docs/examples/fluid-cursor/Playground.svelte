<script lang="ts">
	import { FluidCursor } from "$lib/fancy-ui/fluid-cursor";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<PropsPlayground
	component="FluidCursor"
	slug="fluid-cursor"
	required={["fluidColor"]}
	constraints={[
		"Mount it in a sized, relatively positioned container (`contained` is on by default).",
	]}
	controls={[
		{ key: "splatRadius", type: "range", label: "Splat radius", min: 0.05, max: 0.6, step: 0.01 },
		{ key: "splatForce", type: "range", label: "Splat force", min: 1000, max: 12000, step: 250 },
		{
			key: "densityDissipation",
			type: "range",
			label: "Density fade",
			min: 0.5,
			max: 8,
			step: 0.1,
		},
		{
			key: "velocityDissipation",
			type: "range",
			label: "Velocity fade",
			min: 0.2,
			max: 6,
			step: 0.1,
		},
		{ key: "curl", type: "range", label: "Curl", min: 0, max: 30, step: 1 },
		{ key: "pressure", type: "range", label: "Pressure", min: 0, max: 1, step: 0.05 },
		{ key: "shading", type: "boolean", label: "Shading" },
		{
			key: "colorIntensity",
			type: "range",
			label: "Color intensity",
			min: 0.02,
			max: 0.6,
			step: 0.01,
		},
		{ key: "colorUpdateSpeed", type: "range", label: "Color speed", min: 1, max: 30, step: 1 },
		{ key: "fluidColor", type: "color", label: "Fluid color" },
		{ key: "autoSplat", type: "boolean", label: "Auto splat" },
		{
			key: "autoSplatInterval",
			type: "range",
			label: "Auto interval (ms)",
			min: 300,
			max: 4000,
			step: 100,
		},
		{ key: "hdr", type: "boolean", label: "HDR" },
		{ key: "dither", type: "boolean", label: "Dither" },
		{ key: "ditherPixelSize", type: "range", label: "Dither pixel", min: 1, max: 8, step: 1 },
		{ key: "ditherLevels", type: "range", label: "Dither levels", min: 2, max: 8, step: 1 },
	]}
	initialValues={{
		splatRadius: 0.2,
		splatForce: 6000,
		densityDissipation: 3.5,
		velocityDissipation: 2,
		curl: 3,
		pressure: 0.1,
		shading: true,
		colorIntensity: 0.15,
		colorUpdateSpeed: 10,
		fluidColor: "#8ec5ff",
		autoSplat: false,
		autoSplatInterval: 1500,
		hdr: false,
		dither: false,
		ditherPixelSize: 3,
		ditherLevels: 4,
	}}
>
	{#snippet preview(values)}
		<div
			class="relative h-64 w-[28rem] max-w-[85vw] overflow-hidden rounded-xl border border-black/[0.08] bg-[#fafafa] dark:border-white/[0.08] dark:bg-[#0b0b0c]"
		>
			<!-- Most simulation props are read once at mount: remount on every change. -->
			{#key JSON.stringify(values)}
				<FluidCursor
					splatRadius={values.splatRadius as number}
					splatForce={values.splatForce as number}
					densityDissipation={values.densityDissipation as number}
					velocityDissipation={values.velocityDissipation as number}
					curl={values.curl as number}
					pressure={values.pressure as number}
					shading={values.shading as boolean}
					colorIntensity={values.colorIntensity as number}
					colorUpdateSpeed={values.colorUpdateSpeed as number}
					fluidColor={values.fluidColor as string}
					autoSplat={values.autoSplat as boolean}
					autoSplatInterval={values.autoSplatInterval as number}
					hdr={values.hdr as boolean}
					dither={values.dither as boolean}
					ditherPixelSize={values.ditherPixelSize as number}
					ditherLevels={values.ditherLevels as number}
				/>
			{/key}
			<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
				<p class="text-sm text-neutral-500 select-none">Move your cursor here</p>
			</div>
		</div>
	{/snippet}
</PropsPlayground>
