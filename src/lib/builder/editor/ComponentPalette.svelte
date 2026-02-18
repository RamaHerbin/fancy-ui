<script lang="ts">
	import { getAllBuilderComponents } from '../registry/index.js';
	import type { PaletteCategory } from '../types/registry.js';
	import PaletteItem from './PaletteItem.svelte';

	let search = $state('');

	const allComponents = getAllBuilderComponents();

	let filtered = $derived(
		search.trim()
			? allComponents.filter(
					(c) =>
						c.name.toLowerCase().includes(search.toLowerCase()) ||
						c.description.toLowerCase().includes(search.toLowerCase())
				)
			: allComponents
	);

	const categoryLabels: Record<PaletteCategory, string> = {
		layout: 'Layout',
		text: 'Text',
		cards: 'Cards',
		effects: 'Effects',
		backgrounds: 'Backgrounds',
		buttons: 'Buttons',
		media: 'Media',
		navigation: 'Navigation',
		feedback: 'Feedback',
		'data-display': 'Data Display'
	};

	const categoryOrder: PaletteCategory[] = [
		'layout',
		'text',
		'cards',
		'effects',
		'buttons',
		'media',
		'backgrounds',
		'navigation',
		'feedback',
		'data-display'
	];

	let grouped = $derived.by(() => {
		const groups = new Map<PaletteCategory, typeof filtered>();
		for (const cat of categoryOrder) {
			const items = filtered.filter((c) => c.paletteCategory === cat);
			if (items.length > 0) {
				groups.set(cat, items);
			}
		}
		return groups;
	});
</script>

<div class="flex flex-col gap-1">
	<div class="px-2 pb-1">
		<input
			type="text"
			placeholder="Search components..."
			class="h-8 w-full rounded-md border border-border bg-input px-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
			bind:value={search}
		/>
	</div>

	<div class="space-y-0.5">
		{#each grouped as [category, items]}
			<details class="group" open>
				<summary
					class="flex cursor-pointer items-center gap-1 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground select-none hover:text-foreground"
				>
					<svg
						class="h-3 w-3 shrink-0 transition-transform group-open:rotate-90"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M9 18l6-6-6-6" />
					</svg>
					{categoryLabels[category]}
				</summary>
				<div class="pb-1 pl-1">
					{#each items as meta (meta.slug)}
						<PaletteItem {meta} />
					{/each}
				</div>
			</details>
		{/each}

		{#if grouped.size === 0}
			<p class="px-2 py-4 text-center text-xs text-muted-foreground">No components found</p>
		{/if}
	</div>
</div>
