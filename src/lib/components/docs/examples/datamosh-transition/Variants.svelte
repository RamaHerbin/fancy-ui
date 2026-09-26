<script lang="ts">
	import {
		DatamoshTransition,
		type DatamoshEffect,
		type DatamoshPaletteName,
		type DatamoshSweep,
	} from "$lib/fancy-ui/datamosh-transition";

	const variants: DatamoshEffect[] = ["curtain", "rise", "split", "interlace"];
	const sweeps: DatamoshSweep[] = ["right", "left", "center", "edges", "random"];
	const palettes: DatamoshPaletteName[] = ["broadcast", "thermal", "mono", "acid"];

	let variant = $state<DatamoshEffect>("split");
	let sweep = $state<DatamoshSweep>("center");
	let colors = $state<DatamoshPaletteName>("thermal");
	let transition: ReturnType<typeof DatamoshTransition>;
	let page = $state(1);
	let busy = $state(false);

	async function navigate() {
		if (busy) return;
		busy = true;
		await transition.cover();
		page += 1;
		await transition.reveal();
		busy = false;
	}
</script>

<div class="flex w-full flex-col gap-4">
	<div class="flex flex-wrap gap-x-6 gap-y-3 text-sm">
		{#each [["variant", variants], ["sweep", sweeps], ["colors", palettes]] as const as [label, options] (label)}
			<fieldset class="flex flex-wrap items-center gap-1.5">
				<legend class="sr-only">{label}</legend>
				<span class="text-muted-foreground mr-1">{label}</span>
				{#each options as option (option)}
					{@const active =
						(label === "variant" && variant === option) ||
						(label === "sweep" && sweep === option) ||
						(label === "colors" && colors === option)}
					<button
						class="rounded-full border px-2.5 py-1 text-xs transition-colors {active
							? 'border-foreground bg-foreground text-background'
							: 'border-border hover:bg-muted'}"
						aria-pressed={active}
						onclick={() => {
							if (label === "variant") variant = option as DatamoshEffect;
							else if (label === "sweep") sweep = option as DatamoshSweep;
							else colors = option as DatamoshPaletteName;
						}}
					>
						{option}
					</button>
				{/each}
			</fieldset>
		{/each}
	</div>

	<div
		class="relative flex h-80 w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-[#14101f] text-center text-white"
	>
		<p class="font-mono text-xs tracking-widest text-white/50">
			PAGE {String(page).padStart(2, "0")}
		</p>
		<h3 class="text-3xl font-semibold tracking-tight">{variant} · {sweep}</h3>
		<button
			class="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#14101f] disabled:opacity-60"
			onclick={navigate}
			disabled={busy}
		>
			Next page
		</button>
		<DatamoshTransition bind:this={transition} {variant} {sweep} {colors} contained />
	</div>
</div>
