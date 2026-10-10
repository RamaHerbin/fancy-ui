<script lang="ts">
	import { BorderBeam } from "$lib/fancy-ui/border-beam";

	const speeds = [
		{ label: "Brisk · 5s", duration: 5 },
		{ label: "Default · 9s", duration: 9 },
		{ label: "Drift · 20s", duration: 20 },
	];
</script>

<div class="flex flex-wrap justify-center gap-6">
	{#each speeds as speed (speed.label)}
		<div
			class="relative flex h-32 w-48 items-end overflow-hidden rounded-xl border border-black/[0.08] bg-[#fafafa] p-4 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
		>
			<p class="font-mono text-[11px] text-neutral-500">{speed.label}</p>
			<BorderBeam duration={speed.duration} />
		</div>
	{/each}
</div>
