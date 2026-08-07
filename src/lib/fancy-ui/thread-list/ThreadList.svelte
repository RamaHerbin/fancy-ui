<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { ThreadData } from "../_internals/ai-types.js";

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
		/** Replaces the built-in row body. Receives the thread and whether it is the active one. */
		item?: Snippet<[ThreadData, boolean]>;
		/** Replaces the built-in "no conversations yet" line. */
		empty?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** The root element */
		ref?: HTMLElement | null;
	}
</script>

<script lang="ts">
	import { onMount } from "svelte";
	import { cn } from "$lib/utils.js";
	import { createNow } from "../_internals/elapsed.svelte.js";
	import { formatRelativeTime } from "../_internals/relative-time.js";

	let {
		threads,
		activeId = $bindable(),
		onSelect,
		onDelete,
		label = "Conversations",
		item,
		empty,
		class: className,
		ref = $bindable(null),
	}: ThreadListProps = $props();

	/** How often every timestamp in the list is recomputed. */
	const REFRESH_MS = 30_000;

	// One clock for the whole list: fifty rows cost one interval rather than
	// fifty. Nothing is scheduled until `onMount`, so the list renders unchanged
	// under SSR and a server-rendered page schedules no timer at all.
	const now = createNow(REFRESH_MS);
	onMount(() => now.start());

	function select(thread: ThreadData) {
		// The binding is written whether or not anyone is listening on `onSelect`,
		// so `bind:activeId` alone is enough to drive the highlight.
		activeId = thread.id;
		onSelect?.(thread);
	}

	function remove(event: MouseEvent, thread: ThreadData) {
		// The delete button is a *sibling* of the row button rather than a child —
		// nesting buttons is invalid HTML — so nothing bubbles into a selection
		// today. Stopping it anyway keeps that true if a consumer ever wraps the
		// row in something clickable of their own.
		event.stopPropagation();
		onDelete?.(thread);
	}

	/**
	 * The machine-readable half of a timestamp. A date the browser could not read
	 * has no ISO form, and `datetime=""` is invalid rather than absent, so an
	 * unreadable one is spread onto the element as no attributes at all.
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
	const rows = $derived.by<ThreadRow[]>(() => {
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

<!--
	`ft-threadlist-deletable` rides a `class:` directive rather than `cn()` so the
	compiler can see the class is used and keeps its scoped rules.
-->
<div
	bind:this={ref}
	class={cn("ft-threadlist w-full text-sm", className)}
	class:ft-threadlist-deletable={onDelete !== undefined}
>
	{#if threads.length === 0}
		{#if empty}
			{@render empty()}
		{:else}
			<p class="ft-threadlist-empty text-muted-foreground px-2 py-6 text-center text-xs">
				No conversations yet
			</p>
		{/if}
	{:else}
		<!--
			`role="list"` is stated rather than left implicit: `list-style: none`
			strips list semantics in Safari, and how many conversations there are is
			half of what this list says.
		-->
		<ul class="ft-threadlist-list" role="list" aria-label={label}>
			<!-- Keyed by the identity worked out above, never by the position. -->
			{#each rows as { thread, key } (key)}
				{@const isActive = activeId !== undefined && thread.id === activeId}
				<li class="ft-threadlist-row">
					<button
						type="button"
						class="ft-threadlist-button focus-visible:ring-ring hover:bg-muted/60 flex w-full items-start gap-2 rounded-md py-2 pl-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
						class:ft-threadlist-active={isActive}
						aria-current={isActive ? "true" : undefined}
						onclick={() => select(thread)}
					>
						<!--
							The dot's column is reserved on every row, unread or not, so the
							titles stay on one vertical line instead of stepping in and out as
							messages are read.
						-->
						<span
							class="ft-threadlist-dot"
							class:ft-threadlist-unread={thread.unread}
							aria-hidden="true"
						></span>
						{#if thread.unread}
							<!-- The dot is colour alone, which says nothing out loud. -->
							<span class="sr-only">Unread</span>
						{/if}

						{#if item}
							{@render item(thread, isActive)}
						{:else}
							<span class="ft-threadlist-main min-w-0 flex-1">
								<span class="flex min-w-0 items-baseline gap-2">
									<span
										class="ft-threadlist-title truncate"
										class:ft-threadlist-strong={thread.unread}
										title={thread.title}>{thread.title}</span
									>
									<time
										class="ft-threadlist-time text-muted-foreground ml-auto shrink-0 text-xs tabular-nums"
										{...timeAttrs(thread.updatedAt)}>{relative(thread.updatedAt)}</time
									>
								</span>
								{#if thread.preview}
									<span
										class="ft-threadlist-preview text-muted-foreground mt-0.5 block truncate text-xs"
										title={thread.preview}>{thread.preview}</span
									>
								{/if}
							</span>
						{/if}
					</button>

					{#if onDelete}
						<button
							type="button"
							class="ft-threadlist-delete text-muted-foreground hover:text-foreground focus-visible:ring-ring grid size-7 place-items-center rounded-md focus-visible:ring-2 focus-visible:outline-none"
							aria-label="Delete {thread.title}"
							onclick={(event) => remove(event, thread)}
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
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
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
