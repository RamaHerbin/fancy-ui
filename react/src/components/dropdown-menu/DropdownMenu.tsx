import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { Side, Align } from "../../internals/anchor-position.js";
import { useEventCallback } from "../../internals/dom/use-event-callback.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { DROPDOWN_MENU_KEY } from "./types.js";
import type { DropdownMenuRootContext, MenuCloseOptions } from "./types.js";

export interface DropdownMenuProps {
	/**
	 * Whether the menu is open.
	 *
	 * The source declares this `$bindable(false)`; React has no two-way
	 * channel, so the component keeps its own copy either way — seeded from
	 * this prop and re-synced whenever the caller changes it. `onOpenChange`
	 * fires with the same value at the same moment in every call shape.
	 */
	open?: boolean;
	/** Called with the new value whenever the menu opens or closes, however the change happened. */
	onOpenChange?: (open: boolean) => void;
	/** Side of the trigger to place the menu on. */
	side?: Side;
	/** Alignment along the trigger's cross axis. */
	align?: Align;
	/** Gap in pixels between the trigger and the menu. */
	offset?: number;
	/** Whether arrow-key navigation wraps at the ends. */
	loop?: boolean;
	/** The `DropdownMenuTrigger` and `DropdownMenuContent`. */
	children?: ReactNode;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

/**
 * The root of the menu compound. Renders no DOM of its own — exactly as the
 * source does — and publishes the one context its trigger and content read.
 *
 * No `forwardRef`: the source declares no `ref` binding here, and the Svelte
 * API surface is the contract, per-component.
 */
export function DropdownMenu({
	open: openProp,
	onOpenChange,
	side = "bottom",
	align = "start",
	offset = 4,
	loop = true,
	children,
	sound = false,
}: DropdownMenuProps) {
	// `useFancyId()`, the counterpart of `$props.id()` — the trigger renders
	// its own id unconditionally (not gated on `open`), so it has to agree
	// with itself from the first server-rendered paint. Never `uid()`, which
	// throws on the server by design.
	const uid = useFancyId();
	const contentId = `${uid}-content`;
	const triggerId = `${uid}-trigger`;

	// Both of these are plain `let`s in the source — deliberately NOT reactive
	// state there, and therefore plain refs here. Nothing renders off either
	// one: the content reads `triggerRef` lazily, from an anchor getter and an
	// exclude getter that both run at event time, and `focusEdge` is read once
	// by the effect that moves focus after the panel mounts.
	const triggerRef = useRef<HTMLElement | null>(null);
	const focusEdgeRef = useRef<"first" | "last">("first");

	// The React shape of the source's `open = $bindable(false)`: an internal
	// copy seeded from the prop, re-synced during render whenever the CALLER
	// changes the prop, and free to move on its own in between. That is what
	// makes all three documented call shapes work off one implementation — a
	// caller driving `open` from its own state, a caller who passes only
	// `onOpenChange`, and a caller who passes neither and lets the trigger run
	// the whole thing. A strictly-controlled reading would break the third,
	// which the source supports: writing a bindable prop moves the local copy
	// whether or not the caller bound it.
	//
	// Re-synced in the render path, not an effect: an effect would paint one
	// frame of the stale value first. Same pattern as `Popover`/`Dialog`.
	const [open, setOpenState] = useState(openProp ?? false);
	const [lastOpenProp, setLastOpenProp] = useState(openProp);
	if (lastOpenProp !== openProp) {
		setLastOpenProp(openProp);
		setOpenState(openProp ?? false);
	}

	const openRef = useLiveRef(open);
	const handleOpenChange = useEventCallback(onOpenChange);
	// The `sound &&` guard moves into the hook, so `silent` keeps its exact
	// meaning below and a cue is decided audible inside `sound.play()` at call
	// time rather than at render time.
	const playCue = useSoundCue(sound);

	// The one place `open` changes, in either direction — a plain function,
	// not an effect, so it never reads and writes `open` in the same pass and
	// never fights a controlled caller's own write. Not modal (no focus trap),
	// so returning focus to the trigger on close is this component's own job,
	// done here rather than left to a shared primitive: Escape and an outside
	// click (both routed through the same dismissable callback, on purpose)
	// take this path by default, and Tab does not.
	const setOpen = useCallback(
		(next: boolean, options: MenuCloseOptions = {}): void => {
			if (openRef.current === next) return;
			setOpenState(next);
			handleOpenChange(next);
			if (!options.silent) playCue(next ? "open" : "close");
			// `triggerRef.current?.isConnected` is checked explicitly, not left
			// to `.focus()`'s own silent no-op on a detached element (which
			// would behave identically either way) — stating the intent in
			// code. There is no fallback target beyond this: unlike a modal, a
			// menu has nothing defensible to fall back to, so a consumer who
			// removes the trigger from the DOM while its menu is open gets
			// focus left wherever the browser puts it, not a guess at somewhere
			// better.
			if (!next && (options.returnFocus ?? true) && triggerRef.current?.isConnected) {
				triggerRef.current.focus();
			}
		},
		[openRef, handleOpenChange, playCue]
	);

	// Identity-stable, so the trigger's publish effect and the content's
	// callbacks never re-run just because the root re-rendered.
	const setTriggerRef = useCallback((el: HTMLElement | null): void => {
		triggerRef.current = el;
	}, []);

	const openWithFocus = useCallback(
		(edge: "first" | "last"): void => {
			focusEdgeRef.current = edge;
			setOpen(true);
		},
		[setOpen]
	);

	const close = useCallback(
		(options: MenuCloseOptions = {}): void => {
			setOpen(false, options);
		},
		[setOpen]
	);

	// A plain object rebuilt when its scalar inputs change — the rebuild is
	// what makes the trigger and the content re-render. The two non-reactive
	// fields stay getters over their refs, which is precisely what they are on
	// the source side.
	const context = useMemo<DropdownMenuRootContext>(
		() => ({
			contentId,
			triggerId,
			side,
			align,
			offset,
			loop,
			open,
			sound,
			get focusEdge() {
				return focusEdgeRef.current;
			},
			get triggerRef() {
				return triggerRef.current;
			},
			setTriggerRef,
			openWithFocus,
			close,
		}),
		[
			contentId,
			triggerId,
			side,
			align,
			offset,
			loop,
			open,
			sound,
			setTriggerRef,
			openWithFocus,
			close,
		]
	);

	return <DROPDOWN_MENU_KEY.Provider value={context}>{children}</DROPDOWN_MENU_KEY.Provider>;
}
