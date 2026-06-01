<script lang="ts">
	import { LiquidGlass } from "$lib/fancy-ui/liquid-glass";
</script>

<div
	class="relative flex h-[400px] w-full items-center justify-center overflow-hidden rounded-lg border"
>
	<div
		class="absolute top-1/4 left-1/4 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/30 blur-3xl"
	></div>
	<div class="absolute right-1/4 bottom-1/3 h-64 w-64 rounded-full bg-cyan-500/30 blur-3xl"></div>
	<div
		class="absolute bottom-1/4 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-rose-500/25 blur-3xl"
	></div>

	<div class="absolute inset-0 z-[1] overflow-y-auto" style="scrollbar-width: none;">
		<div class="space-y-8 px-10 py-20" style="min-height: 220%;">
			{#each Array(6) as _, i}
				<div class="flex gap-4">
					{#each Array(5) as _, j}
						<div
							class="h-20 flex-1 rounded-xl"
							style="background: hsl({(i * 5 + j) * 28}, 65%, 55%); opacity: 0.75;"
						></div>
					{/each}
				</div>
				<p class="px-1 text-base font-medium text-white/50">Chromatic displacement in action.</p>
			{/each}
		</div>
	</div>

	<div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
		<div class="pointer-events-auto">
			<LiquidGlass radius={20} frost={0.05}>
				<div
					class="text-foreground flex min-h-16 w-full items-center justify-center px-12 py-4 text-base font-medium"
				>
					Liquid Glass. Try scrolling.
				</div>
			</LiquidGlass>
		</div>
	</div>
</div>
