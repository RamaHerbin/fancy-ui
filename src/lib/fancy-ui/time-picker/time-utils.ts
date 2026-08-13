// Pure "HH:mm" helpers TimePicker builds its slot list and labels from. The
// value contract is always 24-hour "HH:mm" — `hour12` only ever changes how a
// slot is *displayed*, via `formatSlotLabel`, never the string the component
// reads or writes.

const MINUTES_PER_DAY = 24 * 60;

/** Parses "HH:mm" into total minutes since midnight. Returns `null` for anything malformed. */
export function toMinutes(value: string): number | null {
	const match = /^(\d{1,2}):(\d{2})$/.exec(value);
	if (!match) return null;
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
	return hours * 60 + minutes;
}

/** Formats total minutes since midnight back into zero-padded "HH:mm". */
export function fromMinutes(totalMinutes: number): string {
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * The full slot grid for `step`-minute increments, anchored at 00:00 —
 * 00:00, 00:{step}, 00:{2*step}, ... for as long as the slot start is still
 * within the day. A `step` that does not divide 60 or 1440 evenly (45, say)
 * is not special-cased: the loop simply stops once the next start would
 * reach or pass 24:00, which can leave a shorter-than-usual final gap before
 * midnight rather than inserting a partial slot — the defined behaviour the
 * brief asks for, documented here and in the README.
 */
export function generateSlots(step: number): string[] {
	const safeStep = Math.max(1, Math.floor(step));
	const slots: string[] = [];
	for (let minutes = 0; minutes < MINUTES_PER_DAY; minutes += safeStep) {
		slots.push(fromMinutes(minutes));
	}
	return slots;
}

/**
 * Keeps only the slots within `[min, max]` (either bound optional, both
 * inclusive). A bound that does not land exactly on a generated slot simply
 * excludes the slot straddling it, rather than inserting a synthetic one at
 * the bound itself — same "defined, not silently magic" behaviour as
 * `generateSlots`'s own step handling.
 */
export function filterByBounds(slots: string[], min?: string, max?: string): string[] {
	const minMinutes = min ? toMinutes(min) : null;
	const maxMinutes = max ? toMinutes(max) : null;
	return slots.filter((slot) => {
		const value = toMinutes(slot);
		if (value === null) return false;
		if (minMinutes !== null && value < minMinutes) return false;
		if (maxMinutes !== null && value > maxMinutes) return false;
		return true;
	});
}

/**
 * Index of the slot to highlight when the panel opens: an exact match for
 * `value`, else the nearest slot at or after it, else the last slot (`value`
 * is later than every slot), else -1 (no slots at all). A `value` that does
 * not land on a generated boundary — set programmatically while `step`
 * doesn't divide it evenly — still resolves to a sensible neighbour instead
 * of leaving nothing highlighted.
 */
export function nearestIndex(slots: string[], value: string | null | undefined): number {
	if (slots.length === 0) return -1;
	const target = value ? toMinutes(value) : null;
	if (target === null) return 0;

	let best = -1;
	for (let i = 0; i < slots.length; i++) {
		const slotMinutes = toMinutes(slots[i]);
		if (slotMinutes === null) continue;
		if (slotMinutes >= target) {
			best = i;
			break;
		}
	}
	return best === -1 ? slots.length - 1 : best;
}

/** Formats "HH:mm" for display, honouring `hour12` and `locale`. The underlying value never changes shape. */
export function formatSlotLabel(value: string, hour12: boolean, locale?: string): string {
	const minutes = toMinutes(value);
	if (minutes === null) return value;
	// An arbitrary, fixed reference date — only the time-of-day ever reaches
	// the formatter.
	const reference = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
	return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", hour12 }).format(
		reference
	);
}
