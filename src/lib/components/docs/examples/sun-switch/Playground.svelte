<script lang="ts">
	import { SunSwitch, type SunPalette } from "$lib/fancy-ui/sun-switch";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";

	let stage = $state<HTMLElement | null>(null);
	let day = $state(true);

	function paletteOf(values: Record<string, unknown>): SunPalette {
		return [
			values.top as string,
			values.upper as string,
			values.lower as string,
			values.bottom as string,
		];
	}
</script>

<PropsPlayground
	controls={[
		{ key: "radius", type: "range", label: "Radius (cells)", min: 4, max: 16, step: 1 },
		{ key: "cell", type: "range", label: "Cell (px)", min: 3, max: 8, step: 1 },
		{ key: "dot", type: "range", label: "Dot (px)", min: 1, max: 8, step: 1 },
		{ key: "duration", type: "range", label: "Duration (ms)", min: 400, max: 3000, step: 100 },
		{ key: "haloCells", type: "range", label: "Halo (cells)", min: 0, max: 16, step: 1 },
		{ key: "lensRadius", type: "range", label: "Lens radius (cells)", min: 2, max: 16, step: 1 },
		{ key: "nightAlpha", type: "range", label: "Night opacity", min: 0.1, max: 1, step: 0.02 },
		{ key: "top", type: "color", label: "Sun top" },
		{ key: "upper", type: "color", label: "Sun upper middle" },
		{ key: "lower", type: "color", label: "Sun lower middle" },
		{ key: "bottom", type: "color", label: "Sun bottom" },
		{ key: "horizon", type: "boolean", label: "Horizon" },
		{ key: "lens", type: "boolean", label: "Lens" },
		{ key: "sound", type: "boolean", label: "Sound" },
	]}
	initialValues={{
		radius: 10,
		cell: 5,
		dot: 4,
		duration: 1300,
		haloCells: 9,
		lensRadius: 7,
		nightAlpha: 0.42,
		top: "#f7cf4a",
		upper: "#f6a24e",
		lower: "#ef7a5e",
		bottom: "#ea7d9c",
		horizon: true,
		lens: true,
		sound: false,
	}}
>
	{#snippet preview(values)}
		<div
			bind:this={stage}
			class="relative flex h-72 w-[36rem] max-w-full items-center justify-center overflow-hidden rounded-xl border {day
				? 'border-black/10 bg-[#fbf6ec] text-[#201c16]'
				: 'border-white/10 bg-[#13111a] text-[#efeae2]'}"
		>
			<SunSwitch
				bind:checked={day}
				mode="contained"
				scope={stage}
				radius={values.radius as number}
				cell={values.cell as number}
				dot={values.dot as number}
				duration={values.duration as number}
				haloCells={values.haloCells as number}
				lensRadius={values.lensRadius as number}
				nightAlpha={values.nightAlpha as number}
				palette={paletteOf(values)}
				horizon={values.horizon as boolean}
				lens={values.lens as boolean}
				sound={values.sound as boolean}
			/>
		</div>
	{/snippet}
</PropsPlayground>
