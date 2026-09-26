<!--
	Top of the Finds page inside the 13a frame: the divider strip, the title
	row, then a filter row — gesture chips on the left, search and the Saved
	toggle on the right. Every control is a bordered mono cell so the row
	reads as part of the page grid, like the landing header.
-->
<script lang="ts">
	import type { GestureCount } from "$lib/finds/finds.js";
	import type { Gesture } from "$lib/finds/types.js";

	interface Props {
		gestures: GestureCount[];
		total: number;
		gesture: Gesture | "all";
		query: string;
		view: "all" | "saved";
		savedCount: number;
		onGesture: (gesture: Gesture | "all") => void;
		onQuery: (query: string) => void;
		onView: (view: "all" | "saved") => void;
	}

	let { gestures, total, gesture, query, view, savedCount, onGesture, onQuery, onView }: Props =
		$props();
</script>

<div class="lp-line flex h-9 flex-none items-center gap-6 border-b pl-6 sm:pl-[46px]">
	<span class="lp-mono text-[11px] tracking-[0.16em]" style="color:var(--lp-grey-2)"
		>FINDS — UI INTERACTIONS WORTH STUDYING</span
	>
	<span class="mr-6 h-px flex-1" style="background:rgba(242,241,236,.1)"></span>
</div>

<section class="lp-line grid border-b lg:grid-cols-[38fr_62fr]">
	<div
		class="lp-line flex flex-col border-b px-6 pt-8 pb-8 sm:px-10 lg:border-r lg:border-b-0 lg:pl-[46px]"
	>
		<h1
			class="text-[clamp(34px,3.6vw,52px)] leading-[0.96] font-[750] tracking-[-0.03em] text-balance"
		>
			Interactions <br />worth <span class="finds-serif">studying.</span>
		</h1>
		<p class="mt-4 max-w-[340px] text-[14.5px] leading-[1.5]" style="color:#a09f9a">
			Live specimens from the library and references from elsewhere, each with one line on what to
			look at and the clues to build it.
		</p>
	</div>

	<div class="flex flex-col justify-end gap-4 px-6 py-6 sm:px-10">
		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				class="finds-chip lp-mono"
				aria-pressed={gesture === "all"}
				onclick={() => onGesture("all")}>ALL <span class="finds-chip-count">{total}</span></button
			>
			{#each gestures as entry (entry.gesture)}
				<button
					type="button"
					class="finds-chip lp-mono"
					aria-pressed={gesture === entry.gesture}
					onclick={() => onGesture(entry.gesture)}
					>{entry.label.toUpperCase()} <span class="finds-chip-count">{entry.count}</span></button
				>
			{/each}
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<label
				class="finds-search lp-line flex min-w-0 flex-1 items-center gap-2 border"
				style="max-width:360px"
			>
				<span aria-hidden="true" style="color:var(--lp-grey-4)">⌕</span>
				<input
					type="search"
					value={query}
					oninput={(event) => onQuery(event.currentTarget.value)}
					placeholder="Search finds…"
					aria-label="Search finds"
					class="lp-mono min-w-0 flex-1 bg-transparent text-[12.5px] outline-none"
				/>
			</label>
			<button
				type="button"
				class="finds-chip lp-mono"
				aria-pressed={view === "saved"}
				onclick={() => onView(view === "saved" ? "all" : "saved")}
			>
				<svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
					<path
						d="M6 3h12v18l-6-4.5L6 21z"
						fill={view === "saved" ? "currentColor" : "none"}
						stroke="currentColor"
						stroke-width="2.2"
						stroke-linejoin="round"
					/>
				</svg>
				SAVED <span class="finds-chip-count">{savedCount}</span>
			</button>
		</div>
	</div>
</section>

<style>
	.finds-serif {
		font-family: var(--lp-font-serif);
		font-style: italic;
		font-weight: 400;
		font-size: 1.08em;
	}

	.finds-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 30px;
		padding: 0 11px;
		border: 1px solid var(--lp-line-strong);
		border-radius: 2px;
		font-size: 10.5px;
		letter-spacing: 0.12em;
		color: var(--lp-grey-2);
		cursor: pointer;
		transition:
			color 0.15s ease,
			background 0.15s ease,
			border-color 0.15s ease;
	}

	.finds-chip:hover,
	.finds-chip:focus-visible {
		color: var(--lp-ink);
		border-color: var(--lp-accent);
		outline: none;
	}

	.finds-chip[aria-pressed="true"] {
		background: var(--lp-accent);
		border-color: var(--lp-accent);
		color: var(--lp-bg);
	}

	.finds-chip-count {
		opacity: 0.55;
	}

	.finds-search {
		height: 30px;
		padding: 0 10px;
		border-radius: 2px;
		color: var(--lp-ink);
	}

	.finds-search:focus-within {
		border-color: var(--lp-accent);
	}

	.finds-search input::placeholder {
		color: var(--lp-grey-4);
	}

	.finds-search input::-webkit-search-cancel-button {
		filter: invert(1);
	}
</style>
