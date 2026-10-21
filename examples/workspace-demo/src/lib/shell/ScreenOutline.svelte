<script lang="ts" module>
	export interface OutlineSection {
		title: string;
		description: string;
		/** How many placeholder rows the section sketches. */
		rows?: number;
	}
</script>

<script lang="ts">
	import { Skeleton } from "fancy-ui-svelte";

	// A static sketch of a screen's sections while its real content is built:
	// decorative bones (no "loading" announcement), the section names in text.
	let { sections }: { sections: OutlineSection[] } = $props();
</script>

<div class="flex flex-col gap-4" data-testid="screen-outline">
	{#each sections as section (section.title)}
		<section class="border-border bg-card text-card-foreground rounded-xl border p-4 md:p-5">
			<h2 class="text-base font-medium">{section.title}</h2>
			<p class="text-muted-foreground mt-1 text-sm">{section.description}</p>
			<div class="mt-4 flex flex-col gap-3">
				{#each { length: section.rows ?? 2 } as _, i (i)}
					<div class="flex items-center gap-3">
						<Skeleton variant="circle" animation="none" label="" class="size-8 shrink-0" />
						<Skeleton variant="text" lines={2} animation="none" label="" class="min-w-0 flex-1" />
					</div>
				{/each}
			</div>
		</section>
	{/each}
</div>
