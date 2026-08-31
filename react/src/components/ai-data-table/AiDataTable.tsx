import { forwardRef } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import "./ai-data-table.css";

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
	cell?: (value: unknown, at: { row: number; key: string }) => ReactNode;
	/** Additional CSS classes */
	className?: string;
}

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

/**
 * Renders tabular model output — columns and rows, an optional highlighted
 * column, and accessible glyphs for booleans and empty values.
 *
 * The root element arrives through the ref channel rather than a `ref` prop,
 * per PORTING.md — the Svelte source declares `ref = $bindable(null)`.
 *
 * The wrapper is the only thing allowed to scroll sideways: a model asked for
 * nine criteria will produce nine columns, and the page around it must not go
 * on a horizontal rail because of that. Which is why it is focusable and
 * named — a scroll container that only answers to a pointer is unreachable
 * for anyone driving the page from the keyboard.
 */
export const AiDataTable = forwardRef<HTMLDivElement, AiDataTableProps>(
	(
		{ columns, rows, caption, captionVisible = false, dense = false, highlightColumn, cell, className },
		ref
	) => {
		return (
			<div
				ref={ref}
				className={cn("ft-datatable w-full max-w-full overflow-x-auto", className)}
				tabIndex={0}
				role="region"
				aria-label={caption ?? "Data table"}
			>
				<table
					className={cn(
						"ft-datatable-table w-full border-collapse text-sm",
						dense && "ft-datatable-dense"
					)}
				>
					{caption ? (
						<caption
							className={
								captionVisible
									? "ft-datatable-caption text-muted-foreground pb-2 text-left text-xs"
									: "ft-datatable-caption sr-only"
							}
						>
							{caption}
						</caption>
					) : null}

					<thead>
						<tr className="border-border border-b">
							{columns.map((column, columnIndex) => (
								<th
									key={columnIndex}
									scope="col"
									className={cn(
										"text-muted-foreground text-xs font-medium whitespace-nowrap",
										ALIGN_CLASS[alignOf(column)],
										column.numeric && "tabular-nums",
										column.key === highlightColumn && "ft-datatable-highlight"
									)}
								>
									{column.label}
								</th>
							))}
						</tr>
					</thead>

					<tbody>
						{rows.map((row, rowIndex) => (
							<tr key={rowIndex} className={cn(rowIndex % 2 === 1 && "ft-datatable-zebra")}>
								{columns.map((column, columnIndex) => {
									const value = row[column.key];
									return (
										<td
											key={columnIndex}
											className={cn(
												"align-top",
												ALIGN_CLASS[alignOf(column)],
												column.numeric && "tabular-nums",
												column.key === highlightColumn && "ft-datatable-highlight"
											)}
										>
											{cell ? (
												cell(value, { row: rowIndex, key: column.key })
											) : typeof value === "boolean" ? (
												value ? (
													<>
														<svg
															className="ft-datatable-true inline-block size-3.5 align-[-0.15em]"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															strokeWidth="3"
															strokeLinecap="round"
															strokeLinejoin="round"
															aria-hidden="true"
														>
															<path d="m5 13 4 4L19 7" />
														</svg>
														<span className="sr-only">{TRUE_LABEL}</span>
													</>
												) : (
													<>
														<span className="ft-datatable-false text-muted-foreground" aria-hidden="true">
															–
														</span>{" "}
														<span className="sr-only">{FALSE_LABEL}</span>
													</>
												)
											) : value === null || value === undefined || value === "" ? (
												// An empty string is the third way a model says nothing, alongside
												// `null` and a key it never mentioned, so it reads the same way
												// rather than as a cell the renderer dropped on the floor.
												<>
													<span className="ft-datatable-empty text-muted-foreground" aria-hidden="true">
														—
													</span>
													<span className="sr-only">{EMPTY_LABEL}</span>
												</>
											) : (
												value
											)}
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	}
);

AiDataTable.displayName = "AiDataTable";
