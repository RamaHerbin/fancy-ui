import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { Side, Align } from "../../internals/anchor-position.js";
import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { SUB_KEY, useMenuContext } from "./types.js";
import type { SubContext } from "./types.js";

export interface DropdownMenuSubProps {
	/** The `DropdownMenuSubTrigger` and `DropdownMenuSubContent`. */
	children?: ReactNode;
}

// Close-intent delay: leaving the trigger (or the content) starts this timer
// rather than closing immediately, so a pointer travelling from the trigger
// row into the submenu — necessarily crossing empty space for an instant —
// doesn't flicker the submenu shut before it arrives.
const CLOSE_INTENT_MS = 200;

/**
 * The boundary that owns one submenu's open state and its hover-intent
 * timers. Renders no DOM of its own.
 */
export function DropdownMenuSub({ children }: DropdownMenuSubProps) {
	// The *parent* level's context — this component publishes no `MENU_KEY` of
	// its own (only `DropdownMenuSubContent` does, scoped to its own subtree).
	// This is what lets a selection deep inside this submenu close the whole
	// tree, and what lets opening this submenu close a sibling one at the same
	// level.
	const parentMenu = useMenuContext();

	const contentId = useFancyId();

	const [open, setOpen] = useState(false);
	// A synchronous mirror of `open`, written at the same instant `setOpen` is
	// called. The source's `open` is a rune read back synchronously by
	// `openSub`/`closeSub`'s own guards, and React state is not readable until
	// the next render — this ref is what keeps those guards exact.
	const openRef = useRef(false);

	// Plain refs, exactly as in the source, where both are non-reactive `let`s:
	// nothing renders off either one.
	const triggerRef = useRef<HTMLElement | null>(null);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const unregisterOpenSub = useRef<(() => void) | null>(null);

	const [resolvedSide, setResolvedSide] = useState<Side>("right");
	// Reported by `useAnchorPosition` alongside the side: a submenu clamped
	// along its cross axis near a viewport edge no longer touches its trigger
	// at the requested corner, and its entrance has to grow from the real one.
	const [resolvedAlign, setResolvedAlign] = useState<Align>("start");

	const playCue = useSoundCue(parentMenu.sound);
	// Identity-stable members of the parent context, so the callbacks below
	// are not rebuilt just because a level above re-rendered.
	const { closeSiblingSubs, registerOpenSub } = parentMenu;

	const clearCloseTimer = useCallback((): void => {
		if (closeTimer.current !== null) {
			clearTimeout(closeTimer.current);
			closeTimer.current = null;
		}
	}, []);

	const closeSub = useCallback(
		(returnFocus: boolean, silent = false): void => {
			clearCloseTimer();
			if (!openRef.current) return;
			openRef.current = false;
			setOpen(false);
			unregisterOpenSub.current?.();
			unregisterOpenSub.current = null;
			if (returnFocus) triggerRef.current?.focus();
			if (!silent) playCue("close");
		},
		[clearCloseTimer, playCue]
	);

	const openSub = useCallback((): void => {
		clearCloseTimer();
		if (openRef.current) return;
		if (triggerRef.current) closeSiblingSubs(triggerRef.current);
		openRef.current = true;
		setOpen(true);
		if (triggerRef.current) {
			// A close driven by the parent — the whole tree closing after a
			// selection or Escape, or a sibling submenu opening — is silent: the
			// root's own cue (or the sibling's `open`) already told the story.
			unregisterOpenSub.current = registerOpenSub(triggerRef.current, () => closeSub(false, true));
		}
		// A submenu is a real panel opening; it sounds like one. Inherited from
		// the root's `sound` prop through the parent level's context.
		playCue("open");
	}, [clearCloseTimer, closeSiblingSubs, registerOpenSub, closeSub, playCue]);

	const keepOpen = useCallback((): void => {
		clearCloseTimer();
	}, [clearCloseTimer]);

	const scheduleClose = useCallback((): void => {
		clearCloseTimer();
		closeTimer.current = setTimeout(() => {
			closeTimer.current = null;
			closeSub(false);
		}, CLOSE_INTENT_MS);
	}, [clearCloseTimer, closeSub]);

	// Cancels a pending close-intent timer, and releases this submenu's own
	// registration in the parent's open-sub registry, on unmount — not just
	// from the event handlers above. A keyed list reordering can destroy this
	// exact `DropdownMenuSub` while the parent context and its siblings stay
	// alive; without this, a stale timer or a stale `unregisterOpenSub`
	// closure lingers referencing a component that's already gone. Every call
	// along that path already guards itself against a detached/stale target,
	// so this was never a crash — it's hygiene.
	useEffect(() => {
		return () => {
			clearCloseTimer();
			unregisterOpenSub.current?.();
		};
	}, [clearCloseTimer]);

	const setTriggerRef = useCallback((el: HTMLElement | null): void => {
		triggerRef.current = el;
	}, []);

	const setPlacement = useCallback((side: Side, align: Align): void => {
		setResolvedSide(side);
		setResolvedAlign(align);
	}, []);

	const context = useMemo<SubContext>(
		() => ({
			open,
			contentId,
			resolvedSide,
			resolvedAlign,
			get triggerRef() {
				return triggerRef.current;
			},
			setTriggerRef,
			setPlacement,
			openSub,
			closeSub,
			keepOpen,
			scheduleClose,
		}),
		[
			open,
			contentId,
			resolvedSide,
			resolvedAlign,
			setTriggerRef,
			setPlacement,
			openSub,
			closeSub,
			keepOpen,
			scheduleClose,
		]
	);

	return <SUB_KEY.Provider value={context}>{children}</SUB_KEY.Provider>;
}
