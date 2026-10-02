<script lang="ts">
	import { BorderBeam } from "$lib/fancy-ui/border-beam";

	const variants = [
		{ label: "Short tail · 0.1", tail: 0.1, glow: 0.6 },
		{ label: "Long tail · 0.6", tail: 0.6, glow: 0.6 },
		{ label: "No bloom · glow 0", tail: 0.25, glow: 0 },
	];
</script>

<div class="flex flex-wrap justify-center gap-6">
	{#each variants as v (v.label)}
		<div
			class="relative flex h-32 w-48 items-end overflow-hidden rounded-xl border border-black/[0.08] bg-[#fafafa] p-4 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
		>
			<p class="font-mono text-[11px] text-neutral-500">{v.label}</p>
			<BorderBeam tail={v.tail} glow={v.glow} />
		</div>
	{/each}
</div>
