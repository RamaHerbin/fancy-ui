<script lang="ts" module>
	export interface StaticLogoCloudProps {
		/** Additional CSS classes for the grid container */
		class?: string;
		/** Optional title displayed above the logos */
		title?: string;
		/** Array of logos with name and image path */
		logos?: import('./AnimatedLogoCloud.svelte').Logo[];
	}
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';

	let { class: className, title, logos = [] }: StaticLogoCloudProps = $props();
</script>

<div class="w-full py-12">
	<div class="flex w-full flex-col items-center justify-center gap-4 px-4 md:px-8">
		{#if title}
			<div class="font-medium uppercase text-muted-foreground">
				{title}
			</div>
		{/if}
		<div class={cn('grid grid-cols-3 gap-x-4 md:grid-cols-5 lg:grid-cols-8', className)}>
			{#each logos as logo}
				<img src={logo.path} alt={logo.name} class="h-10 w-28 px-2 brightness-0 dark:invert" />
			{/each}
		</div>
	</div>
</div>
