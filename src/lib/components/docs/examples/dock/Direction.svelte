<script lang="ts">
	import { Dock, DockIcon } from "$lib/fancy-ui/dock";
	import type { Direction } from "$lib/fancy-ui/dock";

	const directions: Direction[] = ["top", "middle", "bottom"];
	const swatches = [
		"from-zinc-200 to-zinc-400 dark:from-zinc-500 dark:to-zinc-800",
		"from-zinc-100 to-zinc-300 dark:from-zinc-400 dark:to-zinc-700",
		"from-zinc-200 to-zinc-400 dark:from-zinc-500 dark:to-zinc-800",
	];
</script>

<div class="space-y-8">
	{#each directions as dir (dir)}
		<div>
			<p class="text-muted-foreground mb-3 text-center font-mono text-xs">direction="{dir}"</p>
			<div class="flex justify-center">
				<Dock direction={dir} class="h-[96px]" magnification={36} ariaLabel="Dock aligned {dir}">
					{#each swatches as swatch, i (i)}
						<DockIcon>
							<div
								class="size-full rounded-[30%] border border-black/[0.07] bg-gradient-to-br shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-white/[0.08] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] {swatch}"
							></div>
						</DockIcon>
					{/each}
				</Dock>
			</div>
		</div>
	{/each}
</div>
