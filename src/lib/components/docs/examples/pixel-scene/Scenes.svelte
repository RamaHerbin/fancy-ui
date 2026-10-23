<script lang="ts">
	import { PixelScene, PIXEL_SCENES, type PixelSceneName } from "$lib/fancy-ui/pixel-scene";

	// One instance whose `scene` changes: four live loops would cost four times the CPU.
	let scene = $state<PixelSceneName>("alpine");
	let night = $state(false);

	const label = (name: PixelSceneName) => name.charAt(0).toUpperCase() + name.slice(1);
</script>

<div class="flex w-full flex-col gap-3">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div
			class="border-foreground/15 inline-flex flex-wrap rounded-full border p-1"
			role="group"
			aria-label="Scene"
		>
			{#each PIXEL_SCENES as name (name)}
				<button
					type="button"
					aria-pressed={scene === name}
					class="focus-visible:ring-ring rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none {scene ===
					name
						? 'bg-foreground text-background'
						: 'text-muted-foreground hover:text-foreground'}"
					onclick={() => (scene = name)}
				>
					{label(name)}
				</button>
			{/each}
		</div>
		<button
			type="button"
			aria-pressed={night}
			class="border-foreground/15 hover:bg-foreground/5 focus-visible:ring-ring inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
			onclick={() => (night = !night)}
		>
			<span
				class="size-2 rounded-full {night ? 'bg-[#ffd15c]' : 'bg-foreground/30'}"
				aria-hidden="true"
			></span>
			Night
		</button>
	</div>
	<PixelScene
		{scene}
		{night}
		class="border-foreground/10 text-foreground h-[300px] w-full rounded-2xl border"
	/>
</div>
