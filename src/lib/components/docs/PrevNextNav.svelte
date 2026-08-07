<script lang="ts">
	/**
	 * Previous / next links across the whole component gallery, in alphabetical
	 * order by name. The ends of the sequence do not wrap: the first component
	 * has no previous, the last has no next.
	 *
	 * `prev` / `next` override the registry lookup so non-component pages (the
	 * getting-started sequence) can mount the same control.
	 */
	import { getAllComponents } from "$lib/fancy-ui/registry.js";
	import { t, createSkinState } from "$lib/stores";

	interface NavTarget {
		name: string;
		href: string;
	}

	interface Props {
		/** Slug of the component being shown (registry lookup mode). */
		slug?: string;
		/** Explicit targets — bypass the registry lookup. */
		prev?: NavTarget;
		next?: NavTarget;
	}

	let { slug, prev: prevProp, next: nextProp }: Props = $props();

	const skinState = createSkinState();
	const isRetro = $derived(skinState.skin === "retro-os");

	let ordered = $derived(getAllComponents().sort((a, b) => a.name.localeCompare(b.name, "en")));
	let index = $derived(slug ? ordered.findIndex((c) => c.slug === slug) : -1);
	let previous = $derived(
		prevProp ??
			(index > 0
				? { name: ordered[index - 1].name, href: `/docs/components/${ordered[index - 1].slug}` }
				: undefined)
	);
	let next = $derived(
		nextProp ??
			(index !== -1 && index < ordered.length - 1
				? { name: ordered[index + 1].name, href: `/docs/components/${ordered[index + 1].slug}` }
				: undefined)
	);
</script>

{#if previous || next}
	<!-- `retro-pager*` are hooks for the retro-os docs skin (docs-skin.css); they carry
	     no styles of their own, so the default look is unchanged. -->
	<nav class="retro-pager border-border mt-12 grid grid-cols-2 gap-4 border-t pt-6">
		{#if previous}
			<a
				href={previous.href}
				rel="prev"
				class="retro-pager-link retro-press border-border hover:bg-accent flex flex-col gap-1 rounded-lg border p-4 transition-colors"
			>
				{#if isRetro}<span class="retro-pager-arrow" aria-hidden="true">«</span>{/if}
				<span class="retro-pager-text">
					<span class="retro-pager-eyebrow text-muted-foreground text-xs">{t("comp.previous")}</span
					>
					<span class="retro-pager-name text-foreground text-sm font-medium">{previous.name}</span>
				</span>
			</a>
		{/if}
		{#if next}
			<a
				href={next.href}
				rel="next"
				class="retro-pager-link retro-pager-next retro-press border-border hover:bg-accent col-start-2 flex flex-col items-end gap-1 rounded-lg border p-4 text-end transition-colors"
			>
				<span class="retro-pager-text">
					<span class="retro-pager-eyebrow text-muted-foreground text-xs">{t("comp.next")}</span>
					<span class="retro-pager-name text-foreground text-sm font-medium">{next.name}</span>
				</span>
				{#if isRetro}<span class="retro-pager-arrow" aria-hidden="true">»</span>{/if}
			</a>
		{/if}
	</nav>
{/if}

<style>
	/* Inert by default — the retro-os skin lays the link out as a row and
	   styles the arrow; every other skin keeps the original column layout. */
	.retro-pager-text {
		display: contents;
	}
</style>
