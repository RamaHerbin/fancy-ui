/** Fields where typed keys belong to the visitor, never to an egg. */
const EDITABLE =
	"input, textarea, select, [contenteditable='true'], [contenteditable=''], [role='textbox']";

export function isEditableTarget(target: EventTarget | null): boolean {
	if (!target || typeof (target as Element).closest !== "function") return false;
	return (target as Element).closest(EDITABLE) !== null;
}

/** Shift is allowed (capital letters); meta/ctrl/alt chords belong to shortcuts like ⌘K. */
export function hasModifier(e: KeyboardEvent): boolean {
	return e.metaKey || e.ctrlKey || e.altKey;
}

/** A single visible character ("a", "/", "é"), not "Enter", "ArrowUp" or a space. */
export function isPrintableKey(key: string): boolean {
	return [...key].length === 1 && key.trim() !== "";
}
