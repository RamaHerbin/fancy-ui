<script lang="ts">
	import type { PlaygroundValues } from "$lib/finds/types.js";
	import { Dock, DockIcon } from "$lib/fancy-ui/dock";

	let { values }: { values: PlaygroundValues } = $props();

	const shapes = [
		'<circle cx="12" cy="12" r="9" />',
		'<rect x="4" y="4" width="16" height="16" rx="3" />',
		'<polygon points="12,3 21,20 3,20" />',
		'<rect x="6" y="6" width="12" height="12" rx="6" />',
		'<polygon points="12,2 22,12 12,22 2,12" />',
	];
</script>

<div class="flex h-full w-full items-center justify-center p-6">
	<Dock magnification={values.magnification as number} distance={values.distance as number}>
		{#each shapes as shape (shape)}
			<DockIcon>
				<svg class="size-full" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					{@html shape}
				</svg>
			</DockIcon>
		{/each}
	</Dock>
</div>
