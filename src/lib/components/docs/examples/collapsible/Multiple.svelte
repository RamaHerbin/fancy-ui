<script lang="ts">
	import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "$lib/fancy-ui/collapsible";

	const sections = [
		{ id: "a", title: "Appearance", body: "Theme, density and the accent colour." },
		{ id: "b", title: "Language", body: "The language of menus and messages." },
		{ id: "c", title: "Advanced", body: "Experimental options that may change." },
	];
</script>

<div class="flex w-full max-w-sm flex-col gap-2">
	{#each sections as section (section.id)}
		<Collapsible class="rounded-md border px-3" open={section.id === "a"}>
			<CollapsibleTrigger class="flex w-full items-center justify-between py-2 text-sm font-medium">
				{section.title}
			</CollapsibleTrigger>
			<CollapsibleContent class="text-muted-foreground pb-2 text-sm">
				{section.body}
			</CollapsibleContent>
		</Collapsible>
	{/each}
</div>
