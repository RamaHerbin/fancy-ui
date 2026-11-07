<script lang="ts">
	import { LiquidGlass } from "$lib/fancy-ui/liquid-glass";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";

	const opts = (list: string[]) => list.map((v) => ({ value: v, label: v }));
	const channel = opts(["R", "G", "B"]);
</script>

<PropsPlayground
	component="LiquidGlass"
	slug="liquid-glass"
	constraints={["Place it over a busy background, the refraction needs something to bend."]}
	controls={[
		{ key: "radius", type: "range", label: "Radius", min: 0, max: 60, step: 1 },
		{ key: "border", type: "range", label: "Border", min: 0, max: 0.3, step: 0.01 },
		{ key: "lightness", type: "range", label: "Lightness", min: 0, max: 100, step: 1 },
		{ key: "alpha", type: "range", label: "Alpha", min: 0, max: 1, step: 0.01 },
		{ key: "blur", type: "range", label: "Blur", min: 0, max: 30, step: 1 },
		{ key: "frost", type: "range", label: "Frost", min: 0, max: 0.5, step: 0.01 },
		{ key: "scale", type: "range", label: "Scale", min: -300, max: 300, step: 5 },
		{ key: "rOffset", type: "range", label: "Red offset", min: -40, max: 40, step: 1 },
		{ key: "gOffset", type: "range", label: "Green offset", min: -40, max: 40, step: 1 },
		{ key: "bOffset", type: "range", label: "Blue offset", min: -40, max: 40, step: 1 },
		{
			key: "blend",
			type: "select",
			label: "Blend",
			options: opts(["difference", "normal", "multiply", "screen", "overlay", "exclusion"]),
		},
		{ key: "xChannel", type: "select", label: "X channel", options: channel },
		{ key: "yChannel", type: "select", label: "Y channel", options: channel },
		{ key: "fallbackBlur", type: "range", label: "Fallback blur", min: 0, max: 40, step: 1 },
		{
			key: "fallbackSaturation",
			type: "range",
			label: "Fallback saturation (%)",
			min: 50,
			max: 300,
			step: 10,
		},
	]}
	initialValues={{
		radius: 16,
		border: 0.07,
		lightness: 50,
		alpha: 0.93,
		blur: 11,
		frost: 0.05,
		scale: -180,
		rOffset: 0,
		gOffset: 10,
		bOffset: 20,
		blend: "difference",
		xChannel: "R",
		yChannel: "B",
		fallbackBlur: 20,
		fallbackSaturation: 180,
	}}
>
	{#snippet preview(values)}
		<div
			class="relative flex h-64 w-[28rem] max-w-[85vw] items-center justify-center overflow-hidden rounded-xl border border-black/[0.08] dark:border-white/[0.08]"
		>
			<div
				class="absolute top-1/4 left-1/4 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/30 blur-3xl"
			></div>
			<div
				class="absolute right-1/4 bottom-1/3 h-44 w-44 rounded-full bg-cyan-500/30 blur-3xl"
			></div>
			<div class="absolute inset-0 z-[1] flex flex-col justify-center gap-3 px-6">
				{#each [0, 1, 2, 3] as row (row)}
					<div class="flex gap-3">
						{#each [0, 1, 2, 3, 4] as col (col)}
							<div
								class="h-10 flex-1 rounded-lg"
								style="background: hsl({(row * 5 + col) * 30}, 65%, 55%); opacity: 0.75;"
							></div>
						{/each}
					</div>
				{/each}
			</div>
			<div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
				<div class="pointer-events-auto">
					<LiquidGlass
						radius={values.radius as number}
						border={values.border as number}
						lightness={values.lightness as number}
						alpha={values.alpha as number}
						blur={values.blur as number}
						frost={values.frost as number}
						scale={values.scale as number}
						rOffset={values.rOffset as number}
						gOffset={values.gOffset as number}
						bOffset={values.bOffset as number}
						blend={values.blend as string}
						xChannel={values.xChannel as "R" | "G" | "B"}
						yChannel={values.yChannel as "R" | "G" | "B"}
						fallbackBlur={values.fallbackBlur as number}
						fallbackSaturation={values.fallbackSaturation as number}
					>
						<div class="flex min-h-14 items-center justify-center px-10 py-3 text-sm font-medium">
							Liquid glass
						</div>
					</LiquidGlass>
				</div>
			</div>
		</div>
	{/snippet}
</PropsPlayground>
