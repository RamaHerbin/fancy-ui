<script lang="ts">
	import { BorderBeam } from "$lib/fancy-ui/border-beam";

	const pairs = [
		{ label: "Ice → Lilac", from: "#8ec5ff", to: "#c084fc" },
		{ label: "Mint → Sea", from: "#a7f3d0", to: "#38bdf8" },
		{ label: "Ember → Rose", from: "#fcd9a8", to: "#f472b6" },
	];
</script>

<div class="flex flex-wrap justify-center gap-6">
	{#each pairs as pair (pair.label)}
		<div
			class="relative flex h-32 w-48 items-end overflow-hidden rounded-xl border border-black/[0.08] bg-[#fafafa] p-4 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
		>
			<p class="font-mono text-[11px] text-neutral-500">{pair.label}</p>
			<BorderBeam colorFrom={pair.from} colorTo={pair.to} />
		</div>
	{/each}
</div>
