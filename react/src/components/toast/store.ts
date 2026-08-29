/**
 * Toast store — a module-level singleton, unlike every other reactive helper
 * in this library (which is a per-instance factory a component calls).
 * `toast()` has to be callable from anywhere — a submit handler, a promise
 * rejection, code with no component instance in scope at all — so there can
 * only be one stack per app, shared by whichever `<Toaster>` is mounted.
 *
 * This file owns the data and the timers. `Toast.tsx` and `Toaster.tsx`
 * only render what this exposes; they never touch `items` or the timer map
 * directly.
 *
 * Port note: the source's reactive module state becomes a plain module
 * variable plus a listener set — `toastStore.subscribe` is port-added so a
 * `<Toaster>` can read the stack through `useSyncExternalStore`. The
 * consumer-facing surface (`toast`, `dismissToast`, `toastStore.items`) is
 * unchanged.
 */

export type ToastVariant = "success" | "error" | "info" | "loading";

export interface ToastAction {
	/** Label for the toast's single optional action button, e.g. "Retry". */
	label: string;
	/** Called on activation. Does not dismiss the toast on its own — call `dismissToast` from inside if the action should also close it. */
	onClick: () => void;
}

export interface ToastOptions {
	/** Primary line. */
	title: string;
	/** Secondary line, shown under the title. */
	description?: string;
	/** Controls the icon, the accent color, and the live region's politeness. Defaults to `"info"`. */
	variant?: ToastVariant;
	/**
	 * Milliseconds before auto-dismiss. `Infinity` means sticky — it never
	 * auto-dismisses. Defaults to 5000, except for `variant: "loading"`, which
	 * defaults to `Infinity`: a loading toast has no natural "done" time, and
	 * auto-dismissing it after a fixed delay would misreport an operation
	 * that is still running as finished.
	 */
	duration?: number;
	/** A single optional action button. */
	action?: ToastAction;
}

export interface ToastItem {
	readonly id: string;
	readonly title: string;
	readonly description?: string;
	readonly variant: ToastVariant;
	readonly duration: number;
	readonly action?: ToastAction;
}

/** Toasts visible at once. Past this, the oldest is dismissed to make room for the newest. */
const MAX_VISIBLE = 4;
const DEFAULT_DURATION = 5000;

let items: ToastItem[] = [];
let seq = 0;

/** `<Toaster>` subscribers, notified on every replacement of `items`. */
const listeners = new Set<() => void>();

/** Replaces `items` and notifies subscribers — the one write path, standing in
 *  for the source's reactive assignment. */
function setItems(next: ToastItem[]): void {
	items = next;
	for (const listener of [...listeners]) {
		listener();
	}
}

interface TimerEntry {
	handle: ReturnType<typeof setTimeout> | undefined;
	/**
	 * Absolute epoch ms this toast is due to auto-dismiss. Kept as a fixed
	 * point in time rather than a "remaining ms" that decays on its own —
	 * that's what lets a `<Toaster>` remount just compare it to `Date.now()`
	 * and re-arm, instead of needing to have been watching continuously.
	 */
	deadline: number;
	/**
	 * Epoch ms pausing began, or `undefined` when not paused. Only pausing
	 * (hover/focus, via `pauseToast`) sets this — an unmount clearing this
	 * entry's `handle` does not, because there is no live pointer to have
	 * frozen anything: the deadline keeps meaning what it says regardless of
	 * whether a `<Toaster>` is currently mounted to watch it.
	 */
	pausedAt: number | undefined;
}

// Timers live outside `items` — they are bookkeeping the UI never renders,
// not state a template reads, so there is nothing to gain from making this
// reactive and a `Map` mutated from a `setTimeout` callback is simpler than
// juggling render state for it.
const timers = new Map<string, TimerEntry>();

function clearHandle(id: string) {
	const entry = timers.get(id);
	if (entry?.handle !== undefined) {
		clearTimeout(entry.handle);
		entry.handle = undefined;
	}
}

/** Arms (or re-arms) the live timer counting down to an entry's stored `deadline`. */
function armHandle(id: string) {
	const entry = timers.get(id);
	if (!entry) return;
	const ms = Math.max(0, entry.deadline - Date.now());
	entry.handle = setTimeout(() => dismissToast(id), ms);
}

/**
 * Queues a toast and returns its id (usable with `dismissToast`). A no-op
 * that returns `""` when called outside the browser: there is no client to
 * show it to, and a module-level list surviving across requests on a
 * long-lived server would leak toasts between unrelated users.
 */
export function toast(options: ToastOptions): string {
	if (typeof window === "undefined") {
		return "";
	}

	seq += 1;
	const id = `toast-${seq}`;
	const variant = options.variant ?? "info";
	const duration = options.duration ?? (variant === "loading" ? Infinity : DEFAULT_DURATION);
	const item: ToastItem = {
		id,
		title: options.title,
		description: options.description,
		variant,
		duration,
		action: options.action,
	};

	// Append-ordered, so index 0 is always the longest-standing toast — the
	// one evicted when a new toast would push the stack past the limit.
	const next = [...items, item];
	if (next.length > MAX_VISIBLE) {
		const evicted = next.shift();
		if (evicted) {
			clearHandle(evicted.id);
			timers.delete(evicted.id);
		}
	}
	setItems(next);

	if (Number.isFinite(duration)) {
		timers.set(id, { handle: undefined, deadline: Date.now() + duration, pausedAt: undefined });
		armHandle(id);
	}

	return id;
}

/** Dismisses a toast immediately and clears its timer. Safe to call with an id that no longer exists. */
export function dismissToast(id: string): void {
	setItems(items.filter((item) => item.id !== id));
	clearHandle(id);
	timers.delete(id);
}

/**
 * Pauses a toast's auto-dismiss countdown — e.g. while the pointer or focus
 * is on it — so `resumeToast` can continue it rather than restart it. A
 * no-op for a sticky toast or one already paused (or already unarmed for
 * some other reason, e.g. no `<Toaster>` currently mounted to run it).
 */
export function pauseToast(id: string): void {
	const entry = timers.get(id);
	if (!entry || entry.handle === undefined) return;
	clearHandle(id);
	entry.pausedAt = Date.now();
}

/**
 * Resumes a paused toast's countdown from where it left off — the deadline
 * shifts forward by exactly how long it spent paused, so the toast still
 * gets the same amount of on-screen, unpaused time it was promised. A no-op
 * if a live timer is already counting down (nothing to resume).
 */
export function resumeToast(id: string): void {
	const entry = timers.get(id);
	if (!entry || entry.handle !== undefined) return;
	if (entry.pausedAt !== undefined) {
		entry.deadline += Date.now() - entry.pausedAt;
		entry.pausedAt = undefined;
	}
	if (entry.deadline <= Date.now()) {
		dismissToast(id);
		return;
	}
	armHandle(id);
}

/**
 * Clears every pending timer's *handle* without touching the toasts or their
 * deadlines. `<Toaster>` calls this when it unmounts. Deliberately does not
 * touch `deadline`: unmounting isn't pausing — there is no pointer left
 * hovering anything for a destroyed viewport, so the countdown a toast was
 * promised keeps running in real time whether or not something is currently
 * rendering it. `rearmToastTimers` is the other half of this: whatever a new
 * `<Toaster>` inherits gets a live timer again, counting toward the same
 * deadline. Also clears any stale `pausedAt` — a pause tied to a hover/focus
 * on a now-destroyed element cannot mean anything to whatever mounts next.
 */
export function clearAllToastTimers(): void {
	for (const entry of timers.values()) {
		if (entry.handle !== undefined) {
			clearTimeout(entry.handle);
			entry.handle = undefined;
		}
		entry.pausedAt = undefined;
	}
}

/**
 * Re-arms every timer left unarmed with nothing currently pausing it — i.e.
 * every finite-duration toast whose previous `<Toaster>` went away before
 * its time was up. Call this from a `<Toaster>`'s own mount: without it, a
 * toast that outlives one viewport and is picked up by another stays
 * visible forever with no timer ever going to dismiss it, since nothing else
 * re-arms what `clearAllToastTimers` cleared. A deadline already in the past
 * (the gap between viewports was longer than the time left) re-arms to a
 * near-immediate dismiss through the same path, rather than a special case.
 */
export function rearmToastTimers(): void {
	for (const [id, entry] of timers) {
		if (entry.handle !== undefined) continue; // already counting down
		if (entry.pausedAt !== undefined) continue; // genuinely paused; resumeToast's job
		armHandle(id);
	}
}

/** Read-only view of the current toast stack, oldest first. `<Toaster>` renders this directly; nothing else should need to. */
export const toastStore = {
	get items(): readonly ToastItem[] {
		return items;
	},
	/** Port-added: notifies on every stack change, for `useSyncExternalStore`. */
	subscribe(listener: () => void): () => void {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	},
};
