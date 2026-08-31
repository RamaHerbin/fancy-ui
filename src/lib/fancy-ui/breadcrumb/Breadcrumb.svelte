<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface BreadcrumbItem {
		/** The crumb's visible text. */
		label: string;
		/** Link target. Ignored on the last item — it is always the current page and never a link. */
		href?: string;
	}

	export interface BreadcrumbProps {
		/** The full trail, first to last. The last entry is always the current page. Required. */
		items: BreadcrumbItem[];
		/** Collapse the trail once it holds more than this many items. `0` (the default) never collapses. */
		maxItems?: number;
		/** How many leading items stay visible once collapsed. */
		itemsBeforeCollapse?: number;
		/**
		 * How many trailing items stay visible once collapsed. Floored at `1`
		 * even if given `0` — the last item is the current page, and it is
		 * never hidden.
		 */
		itemsAfterCollapse?: number;
		/** Separator glyph rendered between crumbs. Decorative — never read by a screen reader. */
		separator?: string;
		/** Accessible name for the `<nav>`. */
		label?: string;
		/**
		 * Custom rendering for one crumb, given the item and its index in
		 * `items`. Overriding this hands you the whole crumb, including
		 * deciding whether it is a link and whether it carries
		 * `aria-current` — see the README.
		 */
		item?: Snippet<[BreadcrumbItem, number]>;
		/** Additional CSS classes. */
		class?: string;
		/** Element reference. */
		ref?: HTMLElement | null;
		/**
		 * Plays the select cue through the sound controller when a crumb
		 * rendered by the default (non-`item`-snippet) markup is activated.
		 * Off by default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";

	let {
		items,
		maxItems = 0,
		itemsBeforeCollapse = 1,
		itemsAfterCollapse = 1,
		separator = "/",
		label = "Breadcrumb",
		item,
		class: className,
		ref = $bindable(null),
		sound = false,
	}: BreadcrumbProps = $props();

	// No consumer `onclick` exists on a crumb to forward to — the default
	// anchor has none today — so this just plays and returns, the same shape
	// as a fancy button with no onclick prop of its own.
	function handleCrumbClick() {
		if (sound) soundFx.play("select");
	}

	interface Crumb {
		key: string;
		item: BreadcrumbItem;
		/** Position in the original `items` array — what decides "is this the last one". */
		index: number;
	}
	type Row = Crumb | { kind: "ellipsis"; key: "ellipsis" };

	function toCrumb(entry: BreadcrumbItem, index: number): Crumb {
		// Keyed on the original index plus the label rather than the label
		// alone: two crumbs can legitimately read the same text (a
		// "Settings / General / General" trail, say), and the index makes
		// each key unique regardless.
		return { key: `${index}-${entry.label}`, item: entry, index };
	}

	// Collapsing is a decision about the whole list, not something a single
	// crumb can make for itself — this is why Breadcrumb renders every item
	// itself instead of being a compound of children the caller assembles.
	const rows = $derived.by((): Row[] => {
		const total = items.length;
		const before = Math.max(0, itemsBeforeCollapse);
		// Floored at 1, not 0: the trailing slice below is the only thing that
		// can ever hold the last item, and the last item is the current page —
		// not a crumb this component is willing to hide. `itemsBeforeCollapse`
		// has no such floor because losing the *first* crumb to "…" is a
		// legitimate, non-destructive collapse (see the README).
		const after = Math.max(1, itemsAfterCollapse);

		// Guarded degenerate case: if the visible slice would already cover
		// (or exceed) the whole trail, collapsing cannot save anything
		// without either dropping a crumb entirely or showing one twice —
		// so it is skipped outright and the full trail renders instead.
		const shouldCollapse = maxItems > 0 && total > maxItems && before + after < total;

		if (!shouldCollapse) {
			return items.map(toCrumb);
		}

		const leading = items.slice(0, before).map(toCrumb);
		const trailing = items
			.slice(total - after)
			.map((entry, offset) => toCrumb(entry, total - after + offset));

		return [...leading, { kind: "ellipsis", key: "ellipsis" }, ...trailing];
	});

	const lastIndex = $derived(items.length - 1);
</script>

<nav bind:this={ref} aria-label={label} class={cn("ft-breadcrumb", className)}>
	<ol class="flex flex-wrap items-center gap-1.5 text-[13px]">
		{#each rows as row, i (row.key)}
			{#if i > 0}
				<!-- Purely decorative: never focusable, never read by a screen reader. -->
				<li aria-hidden="true" class="text-muted-foreground/50 select-none">
					{separator}
				</li>
			{/if}
			{#if "kind" in row}
				<!--
					The collapsed middle items are omitted from the accessible tree,
					not tucked behind a disclosure — see the README's "Truncation"
					section for the consequence and the alternative if that is not
					acceptable for a given trail.
				-->
				<li aria-hidden="true" class="text-muted-foreground select-none">…</li>
			{:else}
				{@const isLast = row.index === lastIndex}
				<li class="flex items-center">
					{#if item}
						{@render item(row.item, row.index)}
					{:else if isLast}
						<span aria-current="page" class="text-foreground font-medium">{row.item.label}</span>
					{:else if row.item.href}
						<a
							href={row.item.href}
							class="text-muted-foreground hover:text-foreground transition-colors"
							onclick={handleCrumbClick}
						>
							{row.item.label}
						</a>
					{:else}
						<span class="text-muted-foreground">{row.item.label}</span>
					{/if}
				</li>
			{/if}
		{/each}
	</ol>
</nav>
