/**
 * One selectable row. `id` is what a row is keyed by; `label` is what a
 * person reads and types against. `group` and `meta` are purely
 * presentational — CommandMenu never reorders or sorts `items` itself, it
 * only filters and buckets them by `group` for display.
 */
export interface CommandItem {
	id: string;
	label: string;
	/** Optional right-aligned secondary text — the category column in the mockup. */
	meta?: string;
	/** Optional group heading this item sits under. Items with no group render first, ungrouped. */
	group?: string;
	/** Extra terms the default filter matches against, alongside `label`. Never shown. */
	keywords?: string[];
	disabled?: boolean;
	/** Called when this item is committed — Enter on the active row, or a click. Runs before the component's own `onSelect`. */
	onSelect?: () => void;
}
