<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { FrostedGlass } from "$lib/fancy-ui/frosted-glass";

	let { values }: { values: PlaygroundValues } = $props();

	const rows = Array.from({ length: 4 }, (_, i) => i);
	const cols = Array.from({ length: 6 }, (_, j) => j);
</script>

<div class="relative h-full w-full overflow-hidden bg-[#0b0b0c]">
	<div class="fg-drift absolute inset-x-0 top-0 space-y-3 p-4" aria-hidden="true" data-decorative>
		{#each [...rows, ...rows] as i, n (n)}
			<div class="flex gap-3">
				{#each cols as j (j)}
					<div
						class="h-14 flex-1 rounded-xl"
						style="background: hsl({(i * 6 + j) * 26} 70% 56%); opacity: 0.8;"
					></div>
				{/each}
			</div>
		{/each}
	</div>
	<div class="absolute inset-0 flex items-center justify-center p-6">
		<FrostedGlass radius={9999} scale={values.scale as number}>
			<div class="px-10 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
				Frosted, not blurred
			</div>
		</FrostedGlass>
	</div>
</div>

<style>
	.fg-drift {
		animation: fg-drift 18s linear infinite;
	}

	@keyframes fg-drift {
		to {
			transform: translateY(-50%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.fg-drift {
			animation: none;
		}
	}
</style>
