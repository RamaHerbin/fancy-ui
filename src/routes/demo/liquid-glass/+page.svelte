<script lang="ts">
	import { LiquidGlass } from "$lib/fancy-ui/liquid-glass";
	import { FlickeringGrid } from "$lib/fancy-ui/flickering-grid";
</script>

<svelte:head>
	<title>LiquidGlass - FancyUI</title>
</svelte:head>

<!-- Full viewport demo: scroll the page content behind the fixed glass -->
<div
	class="relative flex h-[calc(100dvh-3.5rem)] w-full items-center justify-center overflow-hidden"
>
	<!-- Animated dot grid background -->
	<FlickeringGrid
		class="absolute inset-0 z-0"
		color="#a78bfa"
		maxOpacity={0.25}
		flickerChance={0.12}
		squareSize={4}
		gridGap={8}
	/>

	<!-- Gradient color blobs -->
	<div
		class="absolute top-1/4 left-1/4 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/30 blur-3xl"
	></div>
	<div class="absolute right-1/4 bottom-1/3 h-64 w-64 rounded-full bg-cyan-500/30 blur-3xl"></div>
	<div
		class="absolute bottom-1/4 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-rose-500/25 blur-3xl"
	></div>

	<!-- Scrollable content behind the glass -->
	<div class="absolute inset-0 z-[1] overflow-y-auto" style="scrollbar-width: none;">
		<div class="space-y-8 px-10 py-20" style="min-height: 220%;">
			{#each Array(10) as _, i}
				<div class="flex gap-4">
					{#each Array(5) as _, j}
						<div
							class="h-20 flex-1 rounded-xl"
							style="background: hsl({(i * 5 + j) * 28}, 65%, 55%); opacity: 0.75;"
						></div>
					{/each}
				</div>
				<p class="px-1 text-base font-medium text-white/50">
					The quick brown fox jumps over the lazy dog — chromatic displacement in action.
				</p>
			{/each}
		</div>
	</div>

	<!-- LiquidGlass centered, stays put while content scrolls -->
	<div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
		<div class="pointer-events-auto">
			<LiquidGlass radius={20} frost={0.05}>
				<div
					class="text-foreground flex min-h-16 w-full items-center justify-center px-12 py-4 text-base font-medium"
				>
					Enjoy the Liquid Glass. Try scrolling through the page.
				</div>
			</LiquidGlass>
		</div>
	</div>
</div>
