import { forwardRef, useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useSyncExternalStore } from "react";

import { cn } from "../../utils.js";
import { Portal } from "../../internals/Portal.js";
import { prefersReducedMotion } from "../../internals/motion/anchored.js";
import { usePresence } from "../../internals/motion/presence.js";
import { DURATIONS, JS_EASINGS } from "../../internals/motion/tokens.js";
import { preset } from "../../internals/motion/transitions.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { clearAllToastTimers, rearmToastTimers, toastStore } from "./store.js";
import type { ToastItem } from "./store.js";
import { Toast } from "./Toast.js";

export type ToasterPosition =
	| "top-left"
	| "top-center"
	| "top-right"
	| "bottom-left"
	| "bottom-center"
	| "bottom-right";

export interface ToasterProps {
	/** Corner (or edge-center) the stack anchors to. Defaults to `"bottom-right"`. */
	position?: ToasterPosition;
	/** Additional classes for the viewport that stacks the toasts. */
	className?: string;
	/**
	 * Plays the `success`/`error` cue through the sound controller when a
	 * toast of that variant appears. Off by default; only audible once the
	 * user has enabled sound.
	 */
	sound?: boolean;
}

// Ids already sounded, kept at *module* scope — unlike `announcedIdsRef`
// below, which is per-instance and thrown away the moment a `<Toaster>`
// unmounts, while `toastStore.items` (a module-level singleton) survives
// that unmount untouched. Without this, a remount while a success/error
// toast is still on screen replays its cue: the announce effect reruns on
// the fresh instance with an empty `announcedIds`, so a toast that has
// already sounded once looks unseen to the sound check too. The live
// region legitimately wants a fresh instance to re-announce (a screen
// reader is not attached to the old, destroyed region), so this is
// checked separately rather than folded into `announcedIds`. Pruned to
// the current stack on every effect run, same bounding `announcedIds`
// already does, so this never grows for the life of the page — ids are
// monotonic and never reused (see `store.ts`'s `toast()`).
const soundedIds = new Set<string>();

const POSITION_CLASSES: Record<ToasterPosition, string> = {
	"top-left": "top-4 left-4 items-start",
	"top-center": "top-4 left-1/2 -translate-x-1/2 items-center",
	"top-right": "top-4 right-4 items-end",
	"bottom-left": "bottom-4 left-4 items-start",
	"bottom-center": "bottom-4 left-1/2 -translate-x-1/2 items-center",
	"bottom-right": "bottom-4 right-4 items-end",
};

// Entrance and exit are two SEPARATE param sets fed to ONE `preset("fade-up")`
// leg per toast, resolved by direction at the instant the leg starts — the
// React spelling of the source's split `in:`/`out:` directives: the exit is
// its own, shorter, shallower gesture rather than the entrance played
// backwards. The source's split deliberately traded away reversal smoothing
// (a toast interrupted mid-exit restarts instead of reversing), and that
// trade costs nothing here either: `toast()` never reuses an id, so the store
// can never re-add a toast that is currently leaving.
const slide = preset("fade-up");

interface ToastSlotProps {
	item: ToastItem;
	/** Still in the store. Flipping false starts the exit; the slot stays
	 *  mounted until it settles, then reports back through `onExited`. */
	present: boolean;
	/** Whether an entrance should play — false only for toasts already queued
	 *  when the viewport first renders, mirroring the source rule that a local
	 *  transition never plays on the initial render of the block that owns it. */
	appear: boolean;
	onExited: (id: string) => void;
}

/**
 * One toast's seat in the viewport: the per-item mount clock the source's
 * keyed `{#each}` provided for free. `presence.mounted` holds the dismissed
 * toast in the DOM — inert — for the length of its exit, and only then does
 * `onExited` let the viewport forget it.
 */
function ToastSlot({ item, present, appear, onExited }: ToastSlotProps) {
	const presence = usePresence(present, {
		appear,
		onExitEnd: () => onExited(item.id),
	});

	// Params are read at leg start, never at render time — which is also when
	// the source resolved `prefersReducedMotion()`, on each directive run,
	// never in a render path.
	const toastRef = presence.register(slide, (entering) =>
		entering
			? {
					duration: prefersReducedMotion() ? 0 : DURATIONS.base,
					distance: 8,
					easing: JS_EASINGS.out,
				}
			: {
					duration: prefersReducedMotion() ? 0 : DURATIONS.exit,
					distance: 4,
					easing: JS_EASINGS.in,
				}
	);

	// A slot whose very first render is already un-present has no exit to run —
	// `usePresence(false)` starts at `mounted === false`, so its clock never
	// reaches `onExitEnd` and the viewport would hold the entry in its rendered
	// list forever. Draining it here is the one path back out.
	const mounted = presence.mounted;
	useEffect(() => {
		if (!present && !mounted) onExited(item.id);
		// Mount-time only: every other route out of the list goes through the
		// exit's `onExitEnd`.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	if (!presence.mounted) return null;

	return (
		<div className="pointer-events-auto">
			<Toast item={item} ref={toastRef} />
		</div>
	);
}

interface ToastSlotsProps {
	items: readonly ToastItem[];
	storeIds: ReadonlySet<string>;
	onExited: (id: string) => void;
}

/**
 * The slot list, as its OWN component so it lives inside `<Portal>`.
 *
 * That placement is the whole point: `<Portal>` resolves its container in a
 * layout effect and renders null until it has one, so the Toaster's own first
 * commit produces no slots at all. A flag raised from the Toaster's mount
 * effect is therefore already set by the time any slot first renders — the
 * ids that must paint at rest have to be captured from the same render pass
 * that creates them, which is this component's first.
 *
 * Those ids are the source's rule that a local transition never plays on the
 * initial render of the block that owns it: a toast raised before any viewport
 * existed, and one inherited by a viewport that replaced another, are simply
 * there. Everything raised afterwards gets a real entrance.
 */
function ToastSlots({ items, storeIds, onExited }: ToastSlotsProps) {
	const initialIdsRef = useRef<ReadonlySet<string> | null>(null);
	if (initialIdsRef.current === null) {
		initialIdsRef.current = new Set(items.map((item) => item.id));
	}
	const initialIds = initialIdsRef.current;

	return (
		<>
			{items.map((item) => (
				<ToastSlot
					key={item.id}
					item={item}
					present={storeIds.has(item.id)}
					appear={!initialIds.has(item.id)}
					onExited={onExited}
				/>
			))}
		</>
	);
}

function announcementText(item: ToastItem): string {
	return item.description ? `${item.title}. ${item.description}` : item.title;
}

const bumpReducer = (n: number) => n + 1;

/**
 * The viewport: portals to `<body>`, renders the store's stack in order, and
 * owns the two live regions plus the timer hand-off protocol (`rearm` on
 * mount, `clear` on unmount).
 */
export const Toaster = forwardRef<HTMLDivElement, ToasterProps>(function Toaster(
	{ position = "bottom-right", className, sound = false },
	forwardedRef
) {
	const playCue = useSoundCue(sound);

	const storeItems = useSyncExternalStore(
		toastStore.subscribe,
		() => toastStore.items,
		// `toast()` is a no-op outside the browser, so the server snapshot is
		// the never-reassigned initial empty stack — referentially stable.
		() => toastStore.items
	);

	// The rendered list lags the store by each dismissed toast's exit: an item
	// the store forgot stays in `rendered` — at its old position, so siblings
	// keep their DOM identity — until its slot reports the exit settled.
	// `renderedRef` is a render-time memo of the previous merge; recomputing it
	// is idempotent for the same inputs, so a repeated render is safe.
	const renderedRef = useRef<readonly ToastItem[]>([]);
	const exitedRef = useRef(new Set<string>());
	const [, bumpExited] = useReducer(bumpReducer, 0);

	const storeIds = new Set(storeItems.map((item) => item.id));
	const prev = renderedRef.current;
	const prevIds = new Set(prev.map((item) => item.id));
	const rendered: ToastItem[] = [];
	for (const item of prev) {
		// Still in the store, or gone from it but not done leaving the screen.
		if (storeIds.has(item.id) || !exitedRef.current.has(item.id)) rendered.push(item);
	}
	for (const item of storeItems) {
		// Append-ordered, exactly like the store itself.
		if (!prevIds.has(item.id)) rendered.push(item);
	}
	renderedRef.current = rendered;

	const handleExited = useCallback((id: string) => {
		exitedRef.current.add(id);
		bumpExited();
	}, []);

	// A settled exit's id has been dropped from `rendered` by the merge above,
	// so after each commit the set can forget everything it holds — pruned here
	// rather than during render, so a re-render between the two stays pure.
	useEffect(() => {
		const live = new Set(renderedRef.current.map((item) => item.id));
		for (const id of [...exitedRef.current]) {
			if (!live.has(id)) exitedRef.current.delete(id);
		}
	});

	// Two regions, mounted empty and never re-created — only their *content*
	// changes. A live region created at the moment of the announcement is not
	// reliably picked up by screen readers; existing from mount and being
	// updated in place is what makes the announcement land. Two of them, not
	// one, because politeness is fixed per region: `polite` must never be
	// upgraded to `assertive` (or the reverse) by mutating the same element's
	// aria-live attribute, which most screen readers do not pick up reliably
	// after the region already exists.
	const [politeAnnouncement, setPoliteAnnouncement] = useState("");
	const [assertiveAnnouncement, setAssertiveAnnouncement] = useState("");

	// Ids already announced, refreshed to exactly the current stack on every
	// run — bounded to "currently visible", rather than growing forever for
	// the life of the page.
	const announcedIdsRef = useRef(new Set<string>());

	useEffect(() => {
		const current = storeItems;

		// Forget any sounded id that has left the stack (dismissed, auto-
		// dismissed, or evicted past `MAX_VISIBLE`) — bounds `soundedIds` to
		// "currently visible", same as `announcedIds` below, instead of
		// growing forever for the life of the page.
		const currentIds = new Set(current.map((item) => item.id));
		for (const id of soundedIds) {
			if (!currentIds.has(id)) soundedIds.delete(id);
		}

		for (const item of current) {
			// Only success/error toasts get a cue — info and loading stay silent.
			// `sound` lives on `<Toaster>`, never on `toast()`'s own options: the
			// caller who raises the toast has no per-call say over whether it
			// plays. Gated on the module-level `soundedIds`, not the
			// per-instance `announcedIds`, so a remount can't replay a cue for a
			// toast that already got one.
			// The ID is recorded whether or not sound is currently opted in:
			// the cue marks a toast APPEARING, so flipping `sound` on later
			// must not retroactively replay outcomes already on screen —
			// `playCue` is the no-op half of that, reading `sound` live.
			if (item.variant === "success" || item.variant === "error") {
				if (!soundedIds.has(item.id)) playCue(item.variant);
				soundedIds.add(item.id);
			}
			if (announcedIdsRef.current.has(item.id)) continue;
			if (item.variant === "error") {
				setAssertiveAnnouncement(announcementText(item));
			} else {
				setPoliteAnnouncement(announcementText(item));
			}
		}
		announcedIdsRef.current = new Set(current.map((item) => item.id));
	}, [storeItems, playCue]);

	// The two halves of the timer hand-off. Re-arming on mount is what stops a
	// toast inherited from a previous viewport from being stuck on screen
	// forever with nothing left to dismiss it; the cleanup stops the live
	// timers, not the toasts or their deadlines — see `clearAllToastTimers`'s
	// own doc comment for why unmounting isn't treated as pausing. An effect,
	// so neither ever runs during SSR.
	useEffect(() => {
		rearmToastTimers();
		return () => {
			clearAllToastTimers();
		};
	}, []);

	// `<Portal>` stays ABOVE any mount gating: it resolves its container in a
	// layout effect and renders null until it has one, and each slot's
	// presence gate lives INSIDE it.
	return (
		<Portal>
			<div ref={forwardedRef} className={cn("ft-toaster contents", className)}>
				<div aria-live="polite" aria-atomic="true" className="sr-only">
					{politeAnnouncement}
				</div>
				<div aria-live="assertive" aria-atomic="true" className="sr-only">
					{assertiveAnnouncement}
				</div>

				<div
					className={cn(
						"ft-toaster-viewport pointer-events-none fixed z-50 flex flex-col gap-2",
						POSITION_CLASSES[position]
					)}
				>
					<ToastSlots items={rendered} storeIds={storeIds} onExited={handleExited} />
				</div>
			</div>
		</Portal>
	);
});
