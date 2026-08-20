<script lang="ts" module>
	export interface Wordmark {
		/** The brand/wordmark text */
		name: string;
		/** Font size in pixels */
		size: number;
		/** Font weight */
		weight: 400 | 700 | 900;
		/** Letter-spacing in pixels */
		tracking?: number;
		/** Render in italic */
		italic?: boolean;
		/** Use a serif font stack instead of the default */
		serif?: boolean;
		/** CSS text-transform */
		transform?: "uppercase" | "lowercase";
	}

	export interface StaticLogoCloudProps {
		/** Additional CSS classes for the grid container */
		class?: string;
		/** Optional title displayed above the logos */
		title?: string;
		/** Array of logos with name and image path */
		logos?: import("./AnimatedLogoCloud.svelte").Logo[];
		/** When provided, renders a static typographic row of wordmarks instead of image logos */
		wordmarks?: Wordmark[];
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let { class: className, title, logos = [], wordmarks }: StaticLogoCloudProps = $props();
</script>

<div class="w-full py-12">
	<div class="flex w-full flex-col items-center justify-center gap-4 px-4 md:px-8">
		{#if title}
			<div class="text-muted-foreground font-medium uppercase">
				{title}
			</div>
		{/if}
		{#if wordmarks}
			<div class={cn("flex flex-wrap items-center justify-around gap-x-9 gap-y-5", className)}>
				{#each wordmarks as mark}
					<span
						style:font-size="{mark.size}px"
						style:font-weight={mark.weight}
						style:letter-spacing={mark.tracking !== undefined ? `${mark.tracking}px` : undefined}
						style:font-style={mark.italic ? "italic" : undefined}
						style:font-family={mark.serif ? 'Georgia, "Times New Roman", serif' : undefined}
						style:text-transform={mark.transform}
						style:opacity="0.85"
					>
						{mark.name}
					</span>
				{/each}
			</div>
		{:else}
			<div class={cn("grid grid-cols-3 gap-x-4 md:grid-cols-5 lg:grid-cols-8", className)}>
				{#each logos as logo}
					<img src={logo.path} alt={logo.name} class="h-10 w-28 px-2 brightness-0 dark:invert" />
				{/each}
			</div>
		{/if}
	</div>
</div>
