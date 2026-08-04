<script lang="ts">
	/**
	 * "Related components" grid — up to three siblings from the same category.
	 *
	 * Gives every component page outbound links to its neighbours, so the deeper
	 * pages of the gallery are reachable in fewer hops from any entry point.
	 */
	import { getAllComponents } from "$lib/fancy-ui/registry.js";
	import type { ComponentMeta } from "$lib/types.js";
	import ComponentCard from "./ComponentCard.svelte";
	import { t } from "$lib/stores";

	interface Props {
		/** The component whose page this is; excluded from its own related list. */
		component: ComponentMeta;
	}

	let { component }: Props = $props();

	const MAX_RELATED = 3;

	let related = $derived(
		getAllComponents()
			.filter((c) => c.category === component.category && c.slug !== component.slug)
			.sort((a, b) => a.name.localeCompare(b.name, "en"))
			.slice(0, MAX_RELATED)
	);
</script>

{#if related.length > 0}
	<section class="mb-10">
		<h2 class="text-foreground mb-4 text-xl font-semibold" id="related">{t("comp.related")}</h2>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each related as sibling (sibling.slug)}
				<ComponentCard component={sibling} />
			{/each}
		</div>
	</section>
{/if}
