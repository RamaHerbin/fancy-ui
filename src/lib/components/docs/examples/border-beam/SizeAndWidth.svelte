<script lang="ts">
	import { BorderBeam } from "$lib/fancy-ui/border-beam";

	const variants = [
		{ label: "Tight pool · 100", size: 100, borderWidth: 1.5 },
		{ label: "Wide pool · 320", size: 320, borderWidth: 1.5 },
		{ label: "Border · 3px", size: 200, borderWidth: 3 },
	];
</script>

<div class="flex flex-wrap justify-center gap-6">
	{#each variants as v (v.label)}
		<div
			class="relative flex h-32 w-48 items-end overflow-hidden rounded-xl border border-black/[0.08] bg-[#fafafa] p-4 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
		>
			<p class="font-mono text-[11px] text-neutral-500">{v.label}</p>
			<BorderBeam size={v.size} borderWidth={v.borderWidth} />
		</div>
	{/each}
</div>
