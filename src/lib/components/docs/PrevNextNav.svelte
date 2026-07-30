<script lang="ts">
	/**
	 * Previous / next links across the whole component gallery, in alphabetical
	 * order by name. The ends of the sequence do not wrap: the first component
	 * has no previous, the last has no next.
	 */
	import { getAllComponents } from "$lib/fancy-ui/registry.js";
	import { t } from "$lib/stores";

	interface Props {
		/** Slug of the component being shown. */
		slug: string;
	}

	let { slug }: Props = $props();

	let ordered = $derived(getAllComponents().sort((a, b) => a.name.localeCompare(b.name, "en")));
	let index = $derived(ordered.findIndex((c) => c.slug === slug));
	let previous = $derived(index > 0 ? ordered[index - 1] : undefined);
	let next = $derived(index !== -1 && index < ordered.length - 1 ? ordered[index + 1] : undefined);
</script>

{#if previous || next}
	<nav class="border-border mt-12 grid grid-cols-2 gap-4 border-t pt-6">
		{#if previous}
			<a
				href="/docs/components/{previous.slug}"
				rel="prev"
				class="border-border hover:bg-accent flex flex-col gap-1 rounded-lg border p-4 transition-colors"
			>
				<span class="text-muted-foreground text-xs">{t("comp.previous")}</span>
				<span class="text-foreground text-sm font-medium">{previous.name}</span>
			</a>
		{/if}
		{#if next}
			<a
				href="/docs/components/{next.slug}"
				rel="next"
				class="border-border hover:bg-accent col-start-2 flex flex-col items-end gap-1 rounded-lg border p-4 text-end transition-colors"
			>
				<span class="text-muted-foreground text-xs">{t("comp.next")}</span>
				<span class="text-foreground text-sm font-medium">{next.name}</span>
			</a>
		{/if}
	</nav>
{/if}
