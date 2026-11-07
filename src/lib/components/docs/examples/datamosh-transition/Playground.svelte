<script lang="ts">
	import {
		DatamoshTransition,
		type DatamoshEffect,
		type DatamoshPaletteName,
		type DatamoshSweep,
	} from "$lib/fancy-ui/datamosh-transition";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";

	let transition: ReturnType<typeof DatamoshTransition> | undefined = $state();
	let busy = $state(false);

	async function run() {
		if (busy || !transition) return;
		busy = true;
		await transition.cover();
		await transition.reveal();
		busy = false;
	}

	const opts = (list: string[]) => list.map((v) => ({ value: v, label: v }));
</script>

<PropsPlayground
	component="DatamoshTransition"
	slug="datamosh-transition"
	constraints={[
		"Mount it once and drive it with `cover()` then `reveal()` from a navigation hook.",
	]}
	controls={[
		{
			key: "variant",
			type: "select",
			label: "Variant",
			options: opts(["curtain", "rise", "split", "interlace"]),
		},
		{
			key: "sweep",
			type: "select",
			label: "Sweep",
			options: opts(["right", "left", "center", "edges", "random"]),
		},
		{
			key: "colors",
			type: "select",
			label: "Palette",
			options: opts(["broadcast", "thermal", "sunset", "acid"]),
		},
		{ key: "seed", type: "number", label: "Seed", min: 1, max: 999, step: 1 },
		{ key: "columns", type: "range", label: "Columns", min: 4, max: 24, step: 1 },
		{ key: "power", type: "range", label: "Power", min: 1, max: 3, step: 0.05 },
		{ key: "tiles", type: "range", label: "Tiles", min: 5, max: 31, step: 2 },
		{ key: "coverDuration", type: "range", label: "Cover (ms)", min: 100, max: 1500, step: 20 },
		{ key: "revealDuration", type: "range", label: "Reveal (ms)", min: 100, max: 1500, step: 20 },
		{ key: "stagger", type: "range", label: "Stagger (ms)", min: 0, max: 120, step: 2 },
		{ key: "speed", type: "range", label: "Speed", min: 0.25, max: 3, step: 0.05 },
	]}
	initialValues={{
		variant: "curtain",
		sweep: "right",
		colors: "broadcast",
		seed: 1,
		columns: 11,
		power: 1.65,
		tiles: 15,
		coverDuration: 380,
		revealDuration: 480,
		stagger: 28,
		speed: 1,
	}}
>
	{#snippet preview(values)}
		<div
			class="relative flex h-64 w-[28rem] max-w-[85vw] flex-col items-center justify-center gap-4 overflow-hidden rounded-xl border border-white/10 bg-[#14101f] text-center text-white"
		>
			<h3 class="text-2xl font-semibold tracking-tight">Page one</h3>
			<button
				type="button"
				class="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#14101f] disabled:opacity-60"
				onclick={run}
				disabled={busy}
			>
				Run the transition
			</button>
			<DatamoshTransition
				bind:this={transition}
				contained
				variant={values.variant as DatamoshEffect}
				sweep={values.sweep as DatamoshSweep}
				colors={values.colors as DatamoshPaletteName}
				seed={values.seed as number}
				columns={values.columns as number}
				power={values.power as number}
				tiles={values.tiles as number}
				coverDuration={values.coverDuration as number}
				revealDuration={values.revealDuration as number}
				stagger={values.stagger as number}
				speed={values.speed as number}
			/>
		</div>
	{/snippet}
</PropsPlayground>
