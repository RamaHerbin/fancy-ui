<script lang="ts">
import type { HTMLAttributes } from "vue";

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
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the select cue through the sound controller when a crumb
	 * rendered by the default (non-`item`-slot) markup is activated.
	 * Off by default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { useSoundCue } from "../../sound/use-sound.js";

defineOptions({ name: "Breadcrumb", inheritAttrs: false });

const {
	items,
	maxItems = 0,
	itemsBeforeCollapse = 1,
	itemsAfterCollapse = 1,
	separator = "/",
	label = "Breadcrumb",
	class: className,
	sound = false,
} = defineProps<BreadcrumbProps>();

defineSlots<{
	/**
	 * Custom rendering for one crumb, given the item and its index in
	 * `items`. Overriding this hands you the whole crumb, including
	 * deciding whether it is a link and whether it carries
	 * `aria-current` — see the README.
	 */
	item?(props: { item: BreadcrumbItem; index: number }): unknown;
}>();

const navRef = useTemplateRef<HTMLElement>("navRef");
defineExpose({ ref: navRef });

const playCue = useSoundCue(() => sound);

// No consumer `onclick` exists on a crumb to forward to — the default
// anchor has none today — so this just plays and returns, the same shape
// as a fancy button with no onclick prop of its own.
function handleCrumbClick() {
	playCue("select");
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
const rows = computed((): Row[] => {
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

const lastIndex = computed(() => items.length - 1);
</script>

<template>
	<nav ref="navRef" :aria-label="label" :class="cn('ft-breadcrumb', className)">
		<ol class="flex flex-wrap items-center gap-1.5 text-[13px]">
			<template v-for="(row, i) in rows" :key="row.key">
				<!-- Purely decorative: never focusable, never read by a screen reader. -->
				<li v-if="i > 0" aria-hidden="true" class="text-muted-foreground/50 select-none">
					{{ separator }}
				</li>
				<!--
					The collapsed middle items are omitted from the accessible tree,
					not tucked behind a disclosure — see the README's "Truncation"
					section for the consequence and the alternative if that is not
					acceptable for a given trail.
				-->
				<li v-if="'kind' in row" aria-hidden="true" class="text-muted-foreground select-none">
					…
				</li>
				<li v-else class="flex items-center">
					<slot v-if="$slots.item" name="item" :item="row.item" :index="row.index" />
					<span
						v-else-if="row.index === lastIndex"
						aria-current="page"
						class="text-foreground font-medium"
					>{{ row.item.label }}</span>
					<a
						v-else-if="row.item.href"
						:href="row.item.href"
						class="text-muted-foreground hover:text-foreground transition-colors"
						@click="handleCrumbClick"
					>{{ row.item.label }}</a>
					<span v-else class="text-muted-foreground">{{ row.item.label }}</span>
				</li>
			</template>
		</ol>
	</nav>
</template>
