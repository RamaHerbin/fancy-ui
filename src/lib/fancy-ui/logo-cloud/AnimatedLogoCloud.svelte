<script lang="ts" module>
	export interface Logo {
		name: string;
		path: string;
	}

	export interface AnimatedLogoCloudProps {
		/** Additional CSS classes for the scrolling container */
		class?: string;
		/** Optional title displayed above the logos */
		title?: string;
		/** Array of logos with name and image path */
		logos?: Logo[];
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let { class: className, title, logos = [] }: AnimatedLogoCloudProps = $props();
</script>

<div class="w-full py-12">
	<div class="mx-auto w-full px-4 md:px-8">
		{#if title}
			<div class="text-muted-foreground text-center font-medium">
				{title}
			</div>
		{/if}
		<div
			class={cn("logo-cloud-mask group relative mt-6 flex gap-6 overflow-hidden p-2", className)}
		>
			{#each { length: 5 } as _}
				<div class="logo-cloud-scroll flex shrink-0 flex-row justify-around gap-6">
					{#each logos as logo}
						<img src={logo.path} alt={logo.name} class="h-10 w-28 px-2 brightness-0 dark:invert" />
					{/each}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.logo-cloud-mask {
		mask-image: linear-gradient(to left, transparent 0%, black 20%, black 80%, transparent 95%);
	}

	/* Resting state: the logos sit still; the scroll only runs without a reduce preference. */
	@media (prefers-reduced-motion: no-preference) {
		.logo-cloud-scroll {
			animation: logo-cloud-scroll 30s linear infinite;
		}

		.logo-cloud-mask:focus-within .logo-cloud-scroll {
			animation-play-state: paused;
		}
	}

	/* Reduced motion removes the travel, never the logos: drop the repeated tracks and the
	   edge fade, and let the one real set wrap and centre so every logo is in view. */
	@media (prefers-reduced-motion: reduce) {
		.logo-cloud-mask {
			mask-image: none;
			flex-wrap: wrap;
			justify-content: center;
		}

		.logo-cloud-mask > .logo-cloud-scroll {
			flex-wrap: wrap;
			flex-shrink: 1;
			justify-content: center;
			width: 100%;
		}

		.logo-cloud-mask > .logo-cloud-scroll:not(:first-child) {
			display: none;
		}
	}

	@keyframes logo-cloud-scroll {
		0% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(calc(-100% - 1.5rem));
		}
	}
</style>
