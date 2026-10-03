<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { LiquidGlass } from "$lib/fancy-ui/liquid-glass";

	let { values }: { values: PlaygroundValues } = $props();

	// Refraction only reads over something busy, so a page of content drifts under the lens.
	const rows = Array.from({ length: 5 }, (_, i) => i);
</script>

<div class="relative h-full w-full overflow-hidden bg-[#f4f4f5]">
	<div
		class="lg-drift absolute inset-x-0 top-0 space-y-3 px-5 pt-5"
		aria-hidden="true"
		data-decorative
	>
		{#each [...rows, ...rows] as i, n (n)}
			<div
				class="flex h-20 items-end rounded-2xl p-3"
				style="background: linear-gradient(120deg, hsl({210 + i * 40} 80% 62%), hsl({250 +
					i * 40} 75% 52%));"
			>
				<span class="text-xs font-semibold text-white/90">Section {i + 1}</span>
			</div>
		{/each}
	</div>
	<div class="absolute inset-x-0 top-5 flex justify-center px-6">
		<LiquidGlass
			radius={23}
			scale={values.scale as number}
			blur={values.blur as number}
			containerClass="w-full max-w-[300px]"
		>
			<nav class="flex w-full items-center justify-between px-5 py-3 text-sm font-semibold">
				<span class="text-gray-900">Studio</span>
				<span class="rounded-full bg-gray-900 px-3 py-1 text-xs text-white">Open</span>
			</nav>
		</LiquidGlass>
	</div>
</div>

<style>
	.lg-drift {
		animation: lg-drift 20s linear infinite;
	}

	@keyframes lg-drift {
		to {
			transform: translateY(-50%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lg-drift {
			animation: none;
		}
	}
</style>
