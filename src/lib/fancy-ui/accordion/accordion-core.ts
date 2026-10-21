/**
 * The framework-free rules of the accordion, shared byte for byte by the
 * Svelte, React and Vue packages: which values are open after a toggle, and
 * where arrow keys send focus.
 */

/** How many items may be open at once. */
export type AccordionType = "single" | "multiple";

/** The stacking axis; it picks the arrow-key pair that moves focus. */
export type AccordionOrientation = "horizontal" | "vertical";

/** What the accordion's `value` carries: one value (`""` for none) or a list. */
export type AccordionValue = string | string[];

/** `value` read as the list of open item values, whatever the type. */
export function openValues(type: AccordionType, value: AccordionValue | undefined): string[] {
	if (type === "multiple") return Array.isArray(value) ? value : value ? [value] : [];
	if (Array.isArray(value)) {
		const [first] = value;
		return first ? [first] : [];
	}
	return value ? [value] : [];
}

/** The `value` an accordion of this type emits for a list of open item values. */
export function valueFor(type: AccordionType, open: string[]): AccordionValue {
	return type === "multiple" ? open : (open[0] ?? "");
}

/**
 * Whether an item that is open may be closed. A single accordion that is not
 * `collapsible` keeps exactly one item open once one has been opened.
 */
export function canClose(type: AccordionType, collapsible: boolean): boolean {
	return type === "multiple" || collapsible;
}

/**
 * The open values after toggling `item`, or `null` when nothing changes (the
 * open item of a single accordion that is not `collapsible`).
 */
export function toggleItem(
	type: AccordionType,
	collapsible: boolean,
	open: string[],
	item: string
): string[] | null {
	if (open.includes(item)) {
		if (!canClose(type, collapsible)) return null;
		return open.filter((value) => value !== item);
	}
	return type === "multiple" ? [...open, item] : [item];
}

/** A step along the list (wrapping) or a jump to one of its ends. */
export type NavigationTarget = { step: 1 | -1 } | { edge: "first" | "last" };

/** What `key` does to focus on this axis, or `null` when it is not a navigation key. */
export function navigationTarget(
	orientation: AccordionOrientation,
	key: string
): NavigationTarget | null {
	const next = orientation === "vertical" ? "ArrowDown" : "ArrowRight";
	const previous = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
	if (key === next) return { step: 1 };
	if (key === previous) return { step: -1 };
	if (key === "Home") return { edge: "first" };
	if (key === "End") return { edge: "last" };
	return null;
}

/** The index focus lands on, wrapping at both ends; `-1` when there is nothing to focus. */
export function targetIndex(count: number, from: number, target: NavigationTarget): number {
	if (count <= 0) return -1;
	if ("edge" in target) return target.edge === "first" ? 0 : count - 1;
	const base = from < 0 ? 0 : from;
	return (((base + target.step) % count) + count) % count;
}
