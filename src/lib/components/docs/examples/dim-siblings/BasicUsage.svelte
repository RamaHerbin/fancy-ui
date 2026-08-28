<script lang="ts">
	import { DimSiblings } from "$lib/fancy-ui/dim-siblings";

	const COLUMNS = [
		{ heading: "Product", links: ["Overview", "Pricing", "Changelog"] },
		{ heading: "Docs", links: ["Guides", "API reference", "Examples"] },
		{ heading: "Company", links: ["About", "Careers", "Blog"] },
		{ heading: "Legal", links: ["Privacy", "Terms", "Security"] },
	];
</script>

<div class="w-full p-6">
	<DimSiblings as="footer" class="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
		{#each COLUMNS as column}
			<div>
				<h3 class="text-foreground text-sm font-semibold">{column.heading}</h3>
				<ul class="mt-3 flex flex-col gap-2">
					{#each column.links as link}
						<li>
							<a
								href="#{link.toLowerCase().replace(/\s+/g, '-')}"
								class="text-muted-foreground hover:text-foreground text-sm">{link}</a
							>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</DimSiblings>
	<p class="text-muted-foreground mt-4 text-xs">
		Hover any link, or Tab to it — the other three columns dim so the one you're in stands out.
	</p>
</div>
