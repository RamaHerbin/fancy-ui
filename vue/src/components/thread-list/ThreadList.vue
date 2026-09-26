<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { ThreadData } from "../../internals/ai-types.js";

/**
 * Props for ThreadList
 */
export interface ThreadListProps {
	/** The conversations to list, in the order they should appear. */
	threads: ThreadData[];
	/** Id of the selected conversation. Bindable — picking a row writes the new id back. */
	activeId?: string;
	/** Called with the conversation the reader picked. `activeId` is written either way. */
	onSelect?: (thread: ThreadData) => void;
	/** Supplying it puts a delete button on every row, revealed on hover or focus. */
	onDelete?: (thread: ThreadData) => void;
	/** Accessible name for the list. */
	label?: string;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/**
	 * Plays select when a different conversation is picked and press when
	 * one is deleted, through the sound controller. Off by default; only
	 * audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { useNow } from "../../internals/use-elapsed.js";
import { formatRelativeTime } from "../../internals/relative-time.js";
import { useSoundCue } from "../../sound/use-sound.js";

defineOptions({ name: "ThreadList", inheritAttrs: false });

const {
	threads,
	onSelect,
	onDelete,
	label = "Conversations",
	class: className,
	sound = false,
} = defineProps<ThreadListProps>();

defineSlots<{
	/**
	 * Replaces the built-in row body. Receives the thread and whether it is the
	 * active one — the source's `Snippet<[ThreadData, boolean]>` positional pair
	 * as the named props a scoped slot carries.
	 */
	item?(props: { thread: ThreadData; active: boolean }): unknown;
	/** Replaces the built-in "no conversations yet" line. */
	empty?(): unknown;
}>();

/** The source's `activeId = $bindable()`. */
const activeId = defineModel<string>("activeId");

const rootEl = useTemplateRef<HTMLDivElement>("rootEl");
defineExpose({ ref: rootEl });

/** How often every timestamp in the list is recomputed. */
const REFRESH_MS = 30_000;

// One clock for the whole list: fifty rows cost one interval rather than
// fifty. Nothing is scheduled until the list is mounted, so the list renders
// unchanged under SSR and a server-rendered page schedules no timer at all.
const now = useNow(REFRESH_MS);

const playCue = useSoundCue(() => sound);

function isActive(thread: ThreadData): boolean {
	return activeId.value !== undefined && thread.id === activeId.value;
}

function select(thread: ThreadData) {
	// Changed-only, matching the sidebar/navbar/tabs rule: re-picking the row
	// that is already active plays nothing. The check gates the cue alone —
	// `onSelect` and the write below still fire unconditionally.
	if (thread.id !== activeId.value) playCue("select");
	// The binding is written whether or not anyone is listening on `onSelect`,
	// so `v-model:activeId` alone is enough to drive the highlight.
	activeId.value = thread.id;
	onSelect?.(thread);
}

function remove(event: MouseEvent, thread: ThreadData) {
	// The delete button is a *sibling* of the row button rather than a child —
	// nesting buttons is invalid HTML — so nothing bubbles into a selection
	// today. Stopping it anyway keeps that true if a consumer ever wraps the
	// row in something clickable of their own — and it is what keeps this
	// press cue from also triggering the row's own select cue.
	event.stopPropagation();
	playCue("press");
	onDelete?.(thread);
}

/**
 * The machine-readable half of a timestamp. A date the browser could not read
 * has no ISO form, and `datetime=""` is invalid rather than absent, so an
 * unreadable one is bound onto the element as no attributes at all.
 */
function timeAttrs(timestamp: Date | number): { datetime?: string; title?: string } {
	const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
	if (!Number.isFinite(date.getTime())) return {};
	const exact = date.toISOString();
	return { datetime: exact, title: exact };
}

function relative(timestamp: Date | number): string {
	return formatRelativeTime(timestamp, { now: now.value });
}

/** One rendered row: the conversation, and the key the block tracks it by. */
interface ThreadRow {
	thread: ThreadData;
	key: string;
}

/**
 * The first thread under an id keeps that id as its key, so a row survives a
 * reorder with its DOM node — and its focus — intact. Only a repeat gets a
 * suffix, and the suffix counts occurrences rather than positions: keying on
 * the position would rename every row below an insertion, destroying the state
 * of rows that never moved.
 *
 * A suffix is also checked against the ids actually in the list, since one of
 * them may well look like a generated one: `x`, `x`, `x#1` would otherwise
 * hand the same key to two different rows.
 */
const rows = computed<ThreadRow[]>(() => {
	const ids = new Set(threads.map((thread) => thread.id));
	const seen = new Map<string, number>();
	const used = new Set<string>();
	return threads.map((thread) => {
		const seenBefore = seen.get(thread.id) ?? 0;
		seen.set(thread.id, seenBefore + 1);
		let key = thread.id;
		if (seenBefore > 0) {
			let suffix = seenBefore;
			do {
				key = `${thread.id}#${suffix}`;
				suffix++;
			} while (ids.has(key) || used.has(key));
		}
		used.add(key);
		return { thread, key };
	});
});
</script>

<template>
	<!--
		`ft-threadlist-deletable` rides an object binding rather than `cn()` so the
		class stays a literal the stylesheet scanner can see.
	-->
	<div
		ref="rootEl"
		:class="[
			cn('ft-threadlist w-full text-sm', className),
			{ 'ft-threadlist-deletable': onDelete !== undefined },
		]"
	>
		<template v-if="threads.length === 0">
			<slot v-if="$slots.empty" name="empty" />
			<p v-else class="ft-threadlist-empty text-muted-foreground px-2 py-6 text-center text-xs">
				No conversations yet
			</p>
		</template>
		<!--
			`role="list"` is stated rather than left implicit: `list-style: none`
			strips list semantics in Safari, and how many conversations there are is
			half of what this list says.
		-->
		<!-- Keyed by the identity worked out above, never by the position. -->
		<ul v-else class="ft-threadlist-list" role="list" :aria-label="label">
			<li v-for="row in rows" :key="row.key" class="ft-threadlist-row">
				<button
					type="button"
					class="ft-threadlist-button focus-visible:ring-ring hover:bg-muted/60 flex w-full items-start gap-2 rounded-md py-2 pl-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
					:class="{ 'ft-threadlist-active': isActive(row.thread) }"
					:aria-current="isActive(row.thread) ? 'true' : undefined"
					@click="select(row.thread)"
				>
					<!--
						The dot's column is reserved on every row, unread or not, so the
						titles stay on one vertical line instead of stepping in and out as
						messages are read.
					-->
					<span
						class="ft-threadlist-dot"
						:class="{ 'ft-threadlist-unread': row.thread.unread }"
						aria-hidden="true"
					></span>
					<!-- The dot is colour alone, which says nothing out loud. -->
					<span v-if="row.thread.unread" class="sr-only">Unread</span>

					<slot
						v-if="$slots.item"
						name="item"
						:thread="row.thread"
						:active="isActive(row.thread)"
					/>
					<span v-else class="ft-threadlist-main min-w-0 flex-1">
						<span class="flex min-w-0 items-baseline gap-2">
							<span
								class="ft-threadlist-title truncate"
								:class="{ 'ft-threadlist-strong': row.thread.unread }"
								:title="row.thread.title"
								>{{ row.thread.title }}</span
							>
							<time
								class="ft-threadlist-time text-muted-foreground ml-auto shrink-0 text-xs tabular-nums"
								v-bind="timeAttrs(row.thread.updatedAt)"
								>{{ relative(row.thread.updatedAt) }}</time
							>
						</span>
						<span
							v-if="row.thread.preview"
							class="ft-threadlist-preview text-muted-foreground mt-0.5 block truncate text-xs"
							:title="row.thread.preview"
							>{{ row.thread.preview }}</span
						>
					</span>
				</button>

				<button
					v-if="onDelete"
					type="button"
					class="ft-threadlist-delete text-muted-foreground hover:text-foreground focus-visible:ring-ring grid size-7 place-items-center rounded-md focus-visible:ring-2 focus-visible:outline-none"
					:aria-label="`Delete ${row.thread.title}`"
					@click="remove($event, row.thread)"
				>
					<svg
						class="size-3.5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M3 6h18" />
						<path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
						<path d="M19 6v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
						<path d="M10 11v6" />
						<path d="M14 11v6" />
					</svg>
				</button>
			</li>
		</ul>
	</div>
</template>

<style scoped>
.ft-threadlist {
	/*
	 * The active tint is a mix of currentColor, so one value reads correctly on
	 * both themes without a `light-dark()` pair. It stays deliberately faint —
	 * seven percent of the text colour — because the row's muted preview line
	 * has to keep its contrast on top of it.
	 */
	--ft-threadlist-active-bg: color-mix(in oklab, currentColor 7%, transparent);
	--ft-threadlist-dot-size: 0.4375rem;
	--ft-threadlist-reveal-duration: 150ms;
}

.ft-threadlist-list {
	margin: 0;
	padding: 0;
	list-style: none;
}

.ft-threadlist-row {
	/* Anchors the delete button, which cannot live inside the row button. */
	position: relative;
}

.ft-threadlist-button {
	/* Room for the delete button, but only on a list that has one. */
	padding-right: 0.5rem;
}

.ft-threadlist-deletable .ft-threadlist-button {
	padding-right: 2.25rem;
}

.ft-threadlist-button.ft-threadlist-active {
	background: var(--ft-threadlist-active-bg);
}

.ft-threadlist-dot {
	flex: none;
	/* Centred on the title's line box: half of 1.25rem, less half the dot. */
	margin-top: 0.40625rem;
	width: var(--ft-threadlist-dot-size);
	height: var(--ft-threadlist-dot-size);
	border-radius: 9999px;
	background: transparent;
}

/*
 * Read at the point of use through the component's own hook, then the
 * `--ft-status-*` vocabulary this whole family shares, then the literal.
 * Setting either anywhere up the tree retints the dot without having to win a
 * specificity fight against this scoped rule.
 */
.ft-threadlist-dot.ft-threadlist-unread {
	background: var(
		--ft-threadlist-unread,
		var(--ft-status-running, light-dark(oklch(0.5 0.18 265), oklch(0.72 0.15 265)))
	);
}

.ft-threadlist-title {
	font-weight: 500;
}

/*
 * Weight rather than a Tailwind pair: `font-medium` and `font-semibold` on the
 * same element would leave the winner to source order in the stylesheet.
 */
.ft-threadlist-title.ft-threadlist-strong {
	font-weight: 600;
}

.ft-threadlist-delete {
	position: absolute;
	top: 0.375rem;
	right: 0.25rem;
	opacity: 0;
}

/*
 * Hidden until wanted, but never *removed*: it stays in the tab order, and
 * tabbing to it lights it up through `:focus-within` on the row.
 */
.ft-threadlist-row:hover .ft-threadlist-delete,
.ft-threadlist-row:focus-within .ft-threadlist-delete {
	opacity: 1;
}

/* Nothing hovers on a touch screen, so there the button is simply always on. */
@media (hover: none) {
	.ft-threadlist-delete {
		opacity: 1;
	}
}

/*
 * The fade lives entirely inside `no-preference`, so reduced motion is not a
 * degraded variant to keep in sync: with the rule gone the button appears and
 * disappears at full opacity, on the same hover and focus.
 */
@media (prefers-reduced-motion: no-preference) {
	.ft-threadlist-delete {
		transition:
			opacity var(--ft-threadlist-reveal-duration) ease,
			color var(--ft-threadlist-reveal-duration) ease;
	}
}
</style>
