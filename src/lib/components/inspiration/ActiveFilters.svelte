<!--
	The active filters as removable chips, plus "Clear all". Rendered in the
	toolbar and repeated in the empty state, so a dead end always shows what
	caused it and how to undo it.
-->
<script lang="ts">
	import { activeChips, type Filters } from "$lib/inspiration/query.js";
	import { COLLECTION_META, type Collection } from "$lib/inspiration/types.js";
	import { FACET_LABELS, FACET_TITLES } from "./labels.js";

	type Chip = ReturnType<typeof activeChips>[number];

	interface Props {
		filters: Filters;
		onRemove: (chip: Chip) => void;
		onClear: () => void;
		class?: string;
	}

	let { filters, onRemove, onClear, class: className = "" }: Props = $props();

	const chips = $derived(activeChips(filters));

	function label(chip: Chip): string {
		if (chip.facet === "q") return `“${chip.value}”`;
		if (chip.facet === "collection")
			return COLLECTION_META[chip.value as Collection]?.title ?? chip.value;
		return FACET_LABELS[chip.facet][chip.value] ?? chip.value;
	}
</script>

{#if chips.length}
	<ul class="af {className}" aria-label="Active filters">
		{#each chips as chip (`${chip.facet}:${chip.value}`)}
			<li>
				<button
					type="button"
					class="chip"
					aria-label="Remove filter {FACET_TITLES[chip.facet]}: {label(chip)}"
					onclick={() => onRemove(chip)}
				>
					<span class="facet fx-mono">{FACET_TITLES[chip.facet]}</span>
					{label(chip)}
					<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
						<path
							d="m3 3 6 6M9 3 3 9"
							stroke="currentColor"
							stroke-width="1.4"
							stroke-linecap="round"
						/>
					</svg>
				</button>
			</li>
		{/each}
		<li>
			<button type="button" class="clear" onclick={onClear}>Clear all</button>
		</li>
	</ul>
{/if}

<style>
	.af {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 28px;
		padding: 0 10px;
		border-radius: 999px;
		font-size: 12.5px;
		color: var(--fx-ink);
		background: var(--fx-card-raised);
		box-shadow: inset 0 0 0 1px var(--fx-hairline-strong);
		cursor: pointer;
	}

	.chip svg {
		color: var(--fx-ink-3);
	}

	.chip:hover svg {
		color: var(--fx-ink);
	}

	.facet {
		font-size: 9.5px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--fx-ink-3);
	}

	.clear {
		height: 28px;
		padding: 0 8px;
		font-size: 12.5px;
		color: var(--fx-ink-2);
		text-decoration: underline;
		text-decoration-color: var(--fx-hairline-strong);
		text-underline-offset: 4px;
		cursor: pointer;
	}

	.clear:hover {
		color: var(--fx-ink);
	}

	@media (pointer: coarse) {
		.chip,
		.clear {
			min-height: 40px;
		}
	}
</style>
