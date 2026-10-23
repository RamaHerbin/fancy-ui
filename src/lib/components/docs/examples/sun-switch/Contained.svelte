<script lang="ts">
	import { SunSwitch } from "$lib/fancy-ui/sun-switch";

	// The wave stays inside the card and leaves the page theme alone.
	let card = $state<HTMLElement | null>(null);
	let day = $state(true);
</script>

<article
	bind:this={card}
	class="relative w-full max-w-sm overflow-hidden rounded-2xl border p-6 {day
		? 'border-black/10 bg-[#fbf6ec] text-[#201c16]'
		: 'border-white/10 bg-[#13111a] text-[#efeae2]'}"
>
	<div class="flex items-start justify-between gap-4">
		<div>
			<p class="text-[11px] tracking-[0.2em] uppercase opacity-60">Reading list</p>
			<h3 class="mt-1 text-xl font-semibold tracking-tight">Tide tables, annotated</h3>
		</div>
		<SunSwitch
			bind:checked={day}
			mode="contained"
			scope={card}
			radius={8}
			lensRadius={5}
			label="Day reading"
			class="-mt-1 shrink-0"
		/>
	</div>
	<p class="mt-5 text-sm leading-relaxed opacity-70">
		Twelve short chapters on the moon, the harbour and the hour the boats come in. Switch the card
		to night reading; the rest of the page keeps its theme.
	</p>
	<p class="mt-5 font-mono text-xs opacity-50">
		{day ? "Day reading" : "Night reading"} · 38 min left
	</p>
</article>
