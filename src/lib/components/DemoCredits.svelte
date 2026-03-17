<script lang="ts">
	import type { ComponentMeta } from "$lib/types.js";

	let { component }: { component: ComponentMeta } = $props();
</script>

{#if component.credits && component.credits.length > 0}
	<div class="border-border mt-12 border-t pt-8">
		<h2 class="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
			Credits
		</h2>
		<ul class="flex flex-col gap-1.5">
			{#each component.credits as credit}
				<li class="text-sm">
					<span class="text-muted-foreground">Inspired by </span>
					{#if credit.url}
						<a
							href={credit.url}
							target="_blank"
							rel="noopener noreferrer"
							class="text-foreground font-medium underline underline-offset-4 transition-opacity hover:opacity-70"
						>
							{credit.source}
						</a>
					{:else}
						<span class="text-foreground font-medium">{credit.source}</span>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
{/if}
