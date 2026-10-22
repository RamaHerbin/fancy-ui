<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/dim-siblings/BasicUsage.svelte.
import { DimSiblings } from "fancy-ui-vue";

const COLUMNS = [
	{ heading: "Product", links: ["Overview", "Pricing", "Changelog"] },
	{ heading: "Docs", links: ["Guides", "API reference", "Examples"] },
	{ heading: "Company", links: ["About", "Careers", "Blog"] },
	{ heading: "Legal", links: ["Privacy", "Terms", "Security"] },
];
</script>

<template>
	<div class="w-full p-6">
		<DimSiblings as="footer" class="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
			<div v-for="column in COLUMNS" :key="column.heading">
				<h3 class="text-foreground text-sm font-semibold">{{ column.heading }}</h3>
				<ul class="mt-3 flex flex-col gap-2">
					<li v-for="link in column.links" :key="link">
						<a
							:href="`#${link.toLowerCase().replace(/\s+/g, '-')}`"
							class="text-muted-foreground hover:text-foreground text-sm"
							>{{ link }}</a
						>
					</li>
				</ul>
			</div>
		</DimSiblings>
		<p class="text-muted-foreground mt-4 text-xs">
			Hover any link, or Tab to it — the other three columns dim so the one you're in stands out.
		</p>
	</div>
</template>
