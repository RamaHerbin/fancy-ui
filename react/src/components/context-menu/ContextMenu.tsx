import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { Side, Align } from "../../internals/anchor-position.js";
import { Portal } from "../../internals/Portal.js";
import { useEventCallback } from "../../internals/dom/use-event-callback.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { CONTEXT_MENU_KEY } from "./types.js";
import type { ContextMenuRootContext } from "./types.js";
import type { MenuCloseOptions } from "../dropdown-menu/types.js";

export interface ContextMenuProps {
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
	/** Side of the pointer to place the menu on. */
	side?: Side;
	/** Alignment along the pointer's cross axis. */
	align?: Align;
	/** Gap in pixels between the pointer and the menu. */
	offset?: number;
	/** Whether arrow-key navigation wraps at the ends. */
	loop?: boolean;
	/** The `ContextMenuTrigger` and `ContextMenuContent`. */
	children?: ReactNode;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

/**
 * The root of the context-menu compound. Publishes the one context its
 * trigger and content read, and renders the zero-size virtual anchor the
 * panel positions itself against — exactly the two things the source does.
 *
 * No `forwardRef`: the source declares no `ref` binding here, and the Svelte
 * API surface is the contract, per-component.
 */
export function ContextMenu({
	open: openProp,
	onOpenChange,
	side = "bottom",
	align = "start",
	offset = 2,
	loop = true,
	children,
	sound = false,
}: ContextMenuProps) {
	// `useFancyId()`, the counterpart of `$props.id()`. Never `uid()`, which
	// throws on the server by design.
	const contentId = useFancyId();

	// A plain `let` in the source — deliberately NOT reactive state there, and
	// therefore a plain ref here. Nothing renders off it: the content reads it
	// lazily, from an anchor getter that runs at position time.
	const anchorRef = useRef<HTMLElement | null>(null);

	const [point, setPoint] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

	// Captured the moment the menu opens, exactly the reasoning
	// `internals/focus-trap.ts`'s own `previouslyFocused` uses for a modal
	// surface — except this component isn't modal and can't reuse that
	// module, so it borrows the pattern locally: remember what had focus,
	// restore it on close if it's still around.
	const previouslyFocused = useRef<HTMLElement | null>(null);

	// The React shape of the source's `open = $bindable(false)`: an internal
	// copy seeded from the prop, re-synced during render whenever the CALLER
	// changes the prop, and free to move on its own in between. That is what
	// makes all three documented call shapes work off one implementation — a
	// caller driving `open` from its own state, a caller who passes only
	// `onOpenChange`, and a caller who passes neither and lets the region run
	// the whole thing. Re-synced in the render path, not an effect: an effect
	// would paint one frame of the stale value first.
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
	// never fights a controlled caller's own write.
	const setOpen = useCallback(
		(next: boolean, options: MenuCloseOptions = {}): void => {
			if (openRef.current === next) return;
			setOpenState(next);
			handleOpenChange(next);
			// `silent` is what keeps one activation to exactly one cue: an
			// item's own `select` closes the whole menu, and this `close` would
			// otherwise sound on top of it.
			if (!options.silent) playCue(next ? "open" : "close");
			if (!next && (options.returnFocus ?? true) && previouslyFocused.current?.isConnected) {
				previouslyFocused.current.focus();
			}
		},
		[openRef, handleOpenChange, playCue]
	);

	const openAt = useCallback(
		(x: number, y: number): void => {
			// Opening a second context menu while this one is already open
			// replaces it rather than stacking: there is only ever one
			// `ContextMenuContent` per root, so moving `point` while `open`
			// stays true just repositions the same panel instead of mounting a
			// second one. Only remember the pre-open focus target the first
			// time — re-remembering it on a reposition would capture the menu's
			// own currently-focused item instead of what was focused before it
			// opened at all.
			if (!openRef.current) {
				previouslyFocused.current = document.activeElement as HTMLElement | null;
			}
			setPoint({ x, y });
			setOpen(true);
		},
		[openRef, setOpen]
	);

	const close = useCallback(
		(options: MenuCloseOptions = {}): void => {
			setOpen(false, options);
		},
		[setOpen]
	);

	// Identity-stable, so the anchor's ref callback never detaches and
	// reattaches just because the root re-rendered.
	const setAnchorRef = useCallback((el: HTMLElement | null): void => {
		anchorRef.current = el;
	}, []);

	// A plain object rebuilt when its scalar inputs change — the rebuild is
	// what makes the content re-render. The non-reactive field stays a getter
	// over its ref, which is precisely what it is on the source side.
	const context = useMemo<ContextMenuRootContext>(
		() => ({
			contentId,
			side,
			align,
			offset,
			loop,
			open,
			point,
			sound,
			get anchorRef() {
				return anchorRef.current;
			},
			setAnchorRef,
			openAt,
			close,
		}),
		[contentId, side, align, offset, loop, open, point, sound, setAnchorRef, openAt, close]
	);

	return (
		<CONTEXT_MENU_KEY.Provider value={context}>
			{children}
			{/*
				The virtual anchor `useAnchorPosition` positions
				`ContextMenuContent` against: a zero-size, `position: fixed`
				point at the last-opened pointer coordinates. The anchor option
				needs a real element to call `getBoundingClientRect()` on —
				there is no DOM node at a right-click, so this one stands in for
				it. Kept mounted for this component's whole lifetime (not just
				while open) so it's already in place, positioned, and ready the
				instant `ContextMenuContent` asks for its rect.

				Portalled, same as `ContextMenuContent` itself: `position: fixed`
				resolves its containing block against the nearest ancestor that
				establishes one — not just `position`/`transform` on that
				ancestor, but `filter`, `perspective`, `will-change: transform`
				and `contain` too, all of which this library ships components
				built on. Left un-portalled, a `<ContextMenu>` nested inside any
				of those would measure this span's `getBoundingClientRect()`
				relative to that ancestor instead of the viewport —
				self-consistent, since the positioning core reads whatever rect
				this span actually reports, but silently wrong: the panel opens
				away from the pointer coordinates `clientX`/`clientY` actually
				reported. Portalling to `document.body` guarantees the same
				containing block `clientX`/`clientY` are already relative to,
				regardless of what the consumer's own tree does around the
				trigger.
			*/}
			<Portal>
				<span
					ref={setAnchorRef}
					className="ft-context-menu-anchor"
					aria-hidden="true"
					style={{
						position: "fixed",
						left: `${point.x}px`,
						top: `${point.y}px`,
						width: 0,
						height: 0,
						pointerEvents: "none",
					}}
				/>
			</Portal>
		</CONTEXT_MENU_KEY.Provider>
	);
}
