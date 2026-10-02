<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { SearchResultData } from "../../internals/ai-types.js";

/**
 * Props for WebSearch
 */
export interface WebSearchProps {
	/** What the agent looked up, shown in the search-bar header */
	query: string;
	/** Hits found so far, oldest first; appending to it lands a new row */
	results: SearchResultData[];
	/** Whether the lookup is still running: drives the scanning bar and the waiting state */
	searching?: boolean;
	/** Called when a row is activated; supplying it turns every row into a button */
	onSelect?: (result: SearchResultData, index: number) => void;
	/** Rows shown before the expander takes over; `0` shows every result */
	maxVisible?: number;
	/** Accessible name for the whole block */
	label?: string;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { hostOf, monogram } from "../../internals/host.js";
import { sanitizeHref } from "../../internals/markdown.js";
import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";

defineOptions({ name: "WebSearch", inheritAttrs: false });

const {
	query,
	results,
	searching = false,
	onSelect,
	maxVisible = 0,
	label = "Web search",
	class: className,
	sound: soundProp = false,
} = defineProps<WebSearchProps>();

defineSlots<{
	/** Replaces the built-in row body, keeping the row element and its behaviour */
	item?(props: { result: SearchResultData; index: number }): unknown;
}>();

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

/**
 * A result url made safe for an `href`, or `null` when it must not be a link
 * at all. These arrive from a model with the rest of the answer, so they clear
 * the same scheme check as every link in this family; a bare host is promoted
 * to `https://` first, since an `href` of "docs.example.dev/guide" resolves
 * against this app's own origin. A genuine relative path is left alone.
 */
function resolveHref(raw: string | undefined): string | null {
	if (typeof raw !== "string" || raw === "") return null;
	const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("//");
	const host = raw.split(/[/?#]/, 1)[0] as string;
	const looksHostLike = !hasScheme && !raw.startsWith("/") && host.includes(".");
	return sanitizeHref(looksHostLike ? `https://${raw}` : raw);
}

const ROW_BASE =
	"ft-websearch-row flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left";
const ROW_INTERACTIVE =
	"hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-ring cursor-pointer transition-colors focus-visible:ring-1 focus-visible:outline-none";

const uid = useFancyId();
const listId = `${uid}-list`;

const expanded = ref(false);

const playCue = useSoundCue(() => soundProp);

// `0` — and any value below it, which would otherwise hide everything — means
// the list is its own cap.
const cap = computed(() => (maxVisible > 0 ? Math.floor(maxVisible) : results.length));
const hiddenCount = computed(() => Math.max(0, results.length - cap.value));

// Expansion only means anything while something is hidden: with nothing behind
// the cap there is no expanded state to be in, and the label and `aria-expanded`
// would otherwise describe a button that is not on screen.
const isExpanded = computed(() => expanded.value && hiddenCount.value > 0);
const visible = computed(() =>
	isExpanded.value || hiddenCount.value === 0 ? results : results.slice(0, cap.value)
);
const countText = computed(() =>
	results.length === 1 ? "1 result" : `${results.length} results`
);

// Each row's derived host, monogram and safe href, resolved once per render
// rather than re-derived at every reference in the template.
const visibleRows = computed(() =>
	visible.value.map((result, index) => {
		const domain = hostOf(result.url);
		return {
			result,
			index,
			domain,
			mark: monogram(domain || result.title),
			safeHref: resolveHref(result.url),
		};
	})
);

// An emptied list is a new search starting, not the old one still expanded: the
// reader asked to see the rest of a result set that no longer exists, so the
// request retires with it and the next set arrives capped like the first.
watch(
	() => results.length,
	(length) => {
		if (length === 0) expanded.value = false;
	},
	{ flush: "post" }
);

function pick(result: SearchResultData, index: number) {
	playCue("select");
	onSelect?.(result, index);
}

/** Disclosure, not a menu: `open`/`close` follow the same toggle either way. */
function toggleExpanded() {
	const next = !isExpanded.value;
	playCue(next ? "open" : "close");
	expanded.value = next;
}
</script>

<template>
	<div
		ref="el"
		:class="cn('ft-websearch w-full text-sm', className)"
		role="group"
		:aria-label="label"
		:aria-busy="searching"
	>
		<div
			class="ft-websearch-header border-border bg-background/60 flex items-center gap-2 rounded-lg border px-3 py-2"
		>
			<svg
				class="text-muted-foreground size-3.5 flex-none"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<circle cx="11" cy="11" r="7" />
				<path d="m20 20-3.6-3.6" />
			</svg>

			<span class="ft-websearch-query text-foreground min-w-0 flex-1 truncate" :title="query">{{
				query
			}}</span>

			<span
				v-if="results.length > 0"
				class="ft-websearch-count text-muted-foreground flex-none text-xs tabular-nums"
				>{{ countText }}</span
			>
		</div>

		<!--
			Decorative: `aria-busy` on the group already says the lookup is running, and
			the waiting line below says it in words while there is nothing to read.
		-->
		<div v-if="searching" class="ft-websearch-scan mt-1.5" aria-hidden="true">
			<span class="ft-websearch-beam"></span>
		</div>

		<ul v-if="visible.length > 0" :id="listId" class="ft-websearch-list mt-1.5">
			<!--
				Keyed by id so an appended hit mounts as a fresh node and plays the
				entrance on its own, while the rows already on screen keep the DOM nodes
				they had — a CSS animation does not replay on an element that has one.
			-->
			<li v-for="row in visibleRows" :key="row.result.id" class="ft-websearch-item">
				<!--
					The row element follows the data: `onSelect` wins and makes every row
					a button; otherwise a safe `url` makes it a link; a hit with neither
					is an inert div. Somebody else's page, arriving from a model:
					`nofollow ugc` keeps the host from vouching for it, and
					`noopener noreferrer` keeps the opened tab away from this one.
				-->
				<component
					:is="onSelect ? 'button' : row.safeHref ? 'a' : 'div'"
					v-bind="
						onSelect
							? { type: 'button' }
							: row.safeHref
								? {
										href: row.safeHref,
										target: '_blank',
										rel: 'noopener noreferrer nofollow ugc',
									}
								: {}
					"
					:class="onSelect || row.safeHref ? cn(ROW_BASE, ROW_INTERACTIVE) : ROW_BASE"
					@click="onSelect || row.safeHref ? pick(row.result, row.index) : undefined"
				>
					<slot name="item" :result="row.result" :index="row.index">
						<!-- A row with no parsable host falls back to its title for the circle. -->
						<span class="ft-websearch-monogram" aria-hidden="true">{{ row.mark }}</span>
						<span class="ft-websearch-text min-w-0 flex-1">
							<span class="ft-websearch-title text-foreground block truncate font-medium">{{
								row.result.title
							}}</span>
							<span
								v-if="row.domain"
								class="ft-websearch-domain text-muted-foreground block truncate text-xs"
								>{{ row.domain }}</span
							>
							<span
								v-if="row.result.snippet"
								class="ft-websearch-snippet text-muted-foreground mt-0.5 text-xs"
								>{{ row.result.snippet }}</span
							>
						</span>
					</slot>
				</component>
			</li>
		</ul>
		<p
			v-else-if="searching"
			class="ft-websearch-status text-muted-foreground mt-1.5 px-2 text-xs"
		>
			Searching…
		</p>
		<p v-else class="ft-websearch-empty text-muted-foreground mt-1.5 px-2 text-xs">No results</p>

		<button
			v-if="hiddenCount > 0"
			type="button"
			class="ft-websearch-more text-muted-foreground hover:text-foreground focus-visible:ring-ring mt-1 cursor-pointer rounded-md px-2 py-1 text-xs transition-colors focus-visible:ring-1 focus-visible:outline-none"
			:aria-expanded="isExpanded"
			:aria-controls="listId"
			@click="toggleExpanded"
		>
			{{ isExpanded ? "Show less" : `Show ${hiddenCount} more` }}
		</button>
	</div>
</template>

<style scoped>
.ft-websearch {
	/* Neutral surfaces are mixes of currentColor, so one set of values reads
	   correctly in both themes. The beam cannot do that — an accent that is a
	   fade of the text colour is not an accent — so it is read at its point of
	   use off the `--ft-status-*` vocabulary this family shares, whose defaults
	   are per-theme `light-dark()` pairs. */
	--ft-websearch-track: color-mix(in oklab, currentColor 12%, transparent);
	--ft-websearch-monogram-bg: color-mix(in oklab, currentColor 10%, transparent);
	--ft-websearch-scan-duration: 1.4s;
	--ft-websearch-enter-duration: 260ms;
	--ft-websearch-snippet-lines: 2;
}

.ft-websearch-list {
	margin: 0;
	padding: 0;
	list-style: none;
}

.ft-websearch-scan {
	position: relative;
	height: 2px;
	overflow: hidden;
	border-radius: 9999px;
	background: var(--ft-websearch-track);
}

/*
 * Reduced motion gets a filled bar rather than a parked beam: a 40% sliver
 * frozen at the left edge reads as a progress bar stuck at 40%, which is a
 * claim this component cannot make.
 */
.ft-websearch-beam {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	border-radius: inherit;
	background: var(
		--ft-websearch-beam,
		var(--ft-status-running, light-dark(oklch(0.5 0.18 265), oklch(0.72 0.15 265)))
	);
	opacity: 0.45;
}

.ft-websearch-monogram {
	display: inline-flex;
	flex: none;
	align-items: center;
	justify-content: center;
	/* Sits on the middle of the title's line box rather than its top. */
	margin-top: 0.0625rem;
	width: 1.25rem;
	height: 1.25rem;
	border-radius: 9999px;
	background: var(--ft-websearch-monogram-bg);
	font-size: 0.625rem;
	font-weight: 600;
	line-height: 1;
}

/* The clamp owns `display`, so the snippet carries no display utility. */
.ft-websearch-snippet {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: var(--ft-websearch-snippet-lines);
	line-clamp: var(--ft-websearch-snippet-lines);
	overflow: hidden;
	line-height: 1.45;
}

/*
 * Both animations live entirely inside `no-preference`, so reduced motion is
 * not a degraded variant to keep in sync: a new row simply appears where it
 * belongs, and the scanning bar is a steady tint instead of a sweep.
 */
@media (prefers-reduced-motion: no-preference) {
	.ft-websearch-item {
		animation: ft-websearch-enter var(--ft-websearch-enter-duration) cubic-bezier(0.16, 1, 0.3, 1);
	}

	.ft-websearch-beam {
		right: auto;
		width: 40%;
		opacity: 1;
		animation: ft-websearch-scan var(--ft-websearch-scan-duration) ease-in-out infinite;
	}
}

@keyframes ft-websearch-enter {
	from {
		opacity: 0;
		transform: translateY(4px);
	}
	to {
		opacity: 1;
		transform: none;
	}
}

/* 250% of a 40%-wide beam is one full track, so it leaves on the right exactly
   as it entered on the left. */
@keyframes ft-websearch-scan {
	from {
		transform: translateX(-100%);
	}
	to {
		transform: translateX(250%);
	}
}
</style>
