<!--
	One facet as a row of toggle chips (aria-pressed), with the catalog count
	of each value. A group, not a radio set: values inside a facet combine
	with OR, so several may be on at once.
-->
<script lang="ts">
	import type { FacetCount } from "$lib/inspiration/query.js";

	interface Props {
		title: string;
		counts: FacetCount[];
		selected: readonly string[];
		onToggle: (value: string) => void;
	}

	let { title, counts, selected, onToggle }: Props = $props();

	const uid = $props.id();
</script>

<div class="fc" role="group" aria-labelledby="fc-{uid}">
	<span id="fc-{uid}" class="legend fx-mono">{title}</span>
	<div class="chips">
		{#each counts as item (item.value)}
			{@const on = selected.includes(item.value)}
			<button
				type="button"
				class="chip"
				aria-pressed={on}
				data-facet-value={item.value}
				onclick={() => onToggle(item.value)}
			>
				{item.label}
				<span class="count fx-mono" aria-hidden="true">{item.count}</span>
				<span class="sr-only">({item.count} references)</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.fc {
		display: flex;
		align-items: baseline;
		gap: 16px;
		min-width: 0;
	}

	.legend {
		flex: none;
		width: 92px;
		font-size: 10.5px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--fx-ink-3);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		min-width: 0;
	}

	.chip {
		/* Anchors the visually hidden count, which would otherwise sit at its
		   static position past the scrolled row and widen the page. */
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 7px;
		height: 30px;
		padding: 0 11px;
		border-radius: 8px;
		font-size: 13px;
		white-space: nowrap;
		color: var(--fx-ink-2);
		box-shadow: inset 0 0 0 1px var(--fx-hairline);
		cursor: pointer;
		transition:
			color 180ms var(--fx-ease),
			background-color 180ms var(--fx-ease),
			box-shadow 180ms var(--fx-ease);
	}

	.chip:hover {
		color: var(--fx-ink);
		box-shadow: inset 0 0 0 1px var(--fx-hairline-strong);
	}

	.chip[aria-pressed="true"] {
		color: var(--fx-canvas);
		background: var(--fx-ink);
		box-shadow: none;
	}

	.count {
		font-size: 11px;
		color: var(--fx-ink-3);
	}

	.chip[aria-pressed="true"] .count {
		color: rgb(9 9 11 / 0.6);
	}

	/* Phones: one scrollable line per facet instead of a tall wrapped block. */
	@media (max-width: 700px) {
		.fc {
			flex-direction: column;
			align-items: stretch;
			gap: 8px;
		}
		.legend {
			width: auto;
		}
		.chips {
			flex-wrap: nowrap;
			width: calc(100% + 32px);
			overflow-x: auto;
			scrollbar-width: none;
			margin-inline: -16px;
			padding-inline: 16px;
			/* Room for the focus ring. */
			padding-block: 3px;
		}
		.chips::-webkit-scrollbar {
			display: none;
		}
	}

	@media (pointer: coarse) {
		.chip {
			min-height: 40px;
		}
	}
</style>
