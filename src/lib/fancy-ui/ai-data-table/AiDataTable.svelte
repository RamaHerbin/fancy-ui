<script lang="ts" module>
	import type { Snippet } from "svelte";

	/** One column, rendered in the order it appears in the array. */
	export interface AiDataTableColumn {
		/** Key looked up on every row. */
		key: string;
		/** Header text. */
		label: string;
		/** Horizontal alignment. Defaults to right on a numeric column, left otherwise. */
		align?: "left" | "center" | "right";
		/** Renders the column with tabular figures, and right-aligns it unless `align` says otherwise. */
		numeric?: boolean;
	}

	/** Everything a cell is allowed to hold — the four things a model actually emits. */
	export type AiDataTableValue = string | number | boolean | null | undefined;

	/** One row, keyed by column key. Missing keys read as empty. */
	export type AiDataTableRow = Record<string, AiDataTableValue>;

	/**
	 * Props for AiDataTable
	 */
	export interface AiDataTableProps {
		/** The columns to render, in order. */
		columns: AiDataTableColumn[];
		/** The rows to render, in the order the model produced them. */
		rows: AiDataTableRow[];
		/** Describes the table for assistive tech. Hidden on screen unless `captionVisible`. */
		caption?: string;
		/** Shows `caption` as a muted line above the table. */
		captionVisible?: boolean;
		/** Tighter rows, for a table read at a glance rather than studied. */
		dense?: boolean;
		/** Key of the column to tint — the recommendation, or whichever criterion decided it. */
		highlightColumn?: string;
		/** Replaces the default cell rendering. Receives the raw value and its position. */
		cell?: Snippet<[unknown, { row: number; key: string }]>;
		/** Additional CSS classes */
		class?: string;
		/** The root element */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		columns,
		rows,
		caption,
		captionVisible = false,
		dense = false,
		highlightColumn,
		cell,
		class: className,
		ref = $bindable(null),
	}: AiDataTableProps = $props();

	/** Spoken in place of the glyphs, which say nothing out loud. */
	const TRUE_LABEL = "True";
	const FALSE_LABEL = "False";
	const EMPTY_LABEL = "No value";

	/**
	 * Written out rather than interpolated: Tailwind reads this file as text, and a
	 * class assembled at runtime is a class it never sees.
	 */
	const ALIGN_CLASS = {
		left: "text-left",
		center: "text-center",
		right: "text-right",
	} as const;

	/** Numbers lean right by default — that is where the eye compares magnitudes. */
	function alignOf(column: AiDataTableColumn): "left" | "center" | "right" {
		return column.align ?? (column.numeric ? "right" : "left");
	}
</script>

<!--
	The wrapper is the only thing allowed to scroll sideways: a model asked for
	nine criteria will produce nine columns, and the page around it must not go on
	a horizontal rail because of that.

	Which is why it is focusable and named. A scroll container that only answers to
	a pointer is unreachable for anyone driving the page from the keyboard, so it
	takes a tab stop and a `region` role to explain what the tab stop is for.
-->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	bind:this={ref}
	class={cn("ft-datatable w-full max-w-full overflow-x-auto", className)}
	tabindex="0"
	role="region"
	aria-label={caption ?? "Data table"}
>
	<table class="ft-datatable-table w-full border-collapse text-sm" class:ft-datatable-dense={dense}>
		{#if caption}
			<caption
				class={captionVisible
					? "ft-datatable-caption text-muted-foreground pb-2 text-left text-xs"
					: "ft-datatable-caption sr-only"}>{caption}</caption
			>
		{/if}

		<thead>
			<tr class="border-border border-b">
				{#each columns as column, columnIndex (columnIndex)}
					<th
						scope="col"
						class={cn(
							"text-muted-foreground text-xs font-medium whitespace-nowrap",
							ALIGN_CLASS[alignOf(column)],
							column.numeric && "tabular-nums",
							column.key === highlightColumn && "ft-datatable-highlight"
						)}>{column.label}</th
					>
				{/each}
			</tr>
		</thead>

		<tbody>
			{#each rows as row, rowIndex (rowIndex)}
				<tr class:ft-datatable-zebra={rowIndex % 2 === 1}>
					{#each columns as column, columnIndex (columnIndex)}
						{@const value = row[column.key]}
						<td
							class={cn(
								"align-top",
								ALIGN_CLASS[alignOf(column)],
								column.numeric && "tabular-nums",
								column.key === highlightColumn && "ft-datatable-highlight"
							)}
						>
							{#if cell}
								{@render cell(value, { row: rowIndex, key: column.key })}
							{:else if typeof value === "boolean"}
								{#if value}
									<svg
										class="ft-datatable-true inline-block size-3.5 align-[-0.15em]"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="3"
										stroke-linecap="round"
										stroke-linejoin="round"
										aria-hidden="true"
									>
										<path d="m5 13 4 4L19 7" />
									</svg>
									<span class="sr-only">{TRUE_LABEL}</span>
								{:else}
									<span class="ft-datatable-false text-muted-foreground" aria-hidden="true">–</span>
									<span class="sr-only">{FALSE_LABEL}</span>
								{/if}
							{:else if value === null || value === undefined || value === ""}
								<!--
									An empty string is the third way a model says nothing, alongside
									`null` and a key it never mentioned, so it reads the same way
									rather than as a cell the renderer dropped on the floor.
								-->
								<span class="ft-datatable-empty text-muted-foreground" aria-hidden="true">—</span>
								<span class="sr-only">{EMPTY_LABEL}</span>
							{:else}
								{value}
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	/*
	 * Padding lives here rather than on every cell so a consumer can retune the
	 * whole grid with one custom property instead of restyling each element.
	 */
	.ft-datatable-table th,
	.ft-datatable-table td {
		padding-block: var(--ft-table-pad-y, 0.5rem);
		padding-inline: var(--ft-table-pad-x, 0.75rem);
	}

	.ft-datatable-table.ft-datatable-dense th,
	.ft-datatable-table.ft-datatable-dense td {
		padding-block: var(--ft-table-dense-pad-y, 0.25rem);
	}

	/*
	 * Zebra sits on the row and the tint on the cell, so the two never fight over
	 * one background: a tinted cell simply paints over the stripe underneath it.
	 * Both are mixes of `currentColor`, which is how they stay legible on a light
	 * page and a dark one without knowing which they are on.
	 */
	.ft-datatable-zebra {
		background: var(--ft-table-zebra, color-mix(in oklab, currentColor 3%, transparent));
	}

	.ft-datatable-highlight {
		background: var(--ft-table-highlight, color-mix(in oklab, currentColor 5%, transparent));
	}

	.ft-datatable-true {
		color: var(
			--ft-table-true,
			var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)))
		);
	}
</style>
