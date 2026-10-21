/** One row of a TickNav. */
export interface TickNavItem {
	/** Stable id; matched against `value` to mark the current row. */
	id: string;
	/** Visible text. */
	label: string;
	/** Renders the row as a link when set; otherwise it is a button. */
	href?: string;
	/** Short trailing tag, such as "New". */
	badge?: string;
	/** Greyed out, not activatable, silent. */
	disabled?: boolean;
}
