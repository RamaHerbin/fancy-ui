import { forwardRef } from "react";

import { cn } from "../../utils.js";
import { Portal } from "../../internals/Portal.js";
import { useDismissable } from "../../internals/dismissable.js";
import { useFocusTrap } from "../../internals/focus-trap.js";
import { useScrollLock } from "../../internals/scroll-lock.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { anchored } from "../../internals/motion/anchored.js";
import { DURATIONS } from "../../internals/motion/tokens.js";
import { usePresence } from "../../internals/motion/presence.js";
import type { DialogSurfaceProps } from "./types.js";
import "./dialog-surface.css";

export const DialogSurface = forwardRef<HTMLDivElement, DialogSurfaceProps>(function DialogSurface(
	{
		open,
		role,
		titleId,
		descriptionId,
		escape,
		outsideClick,
		onDismiss,
		initialFocus = null,
		fallbackFocus,
		exclude,
		panelClass,
		children,
	},
	forwardedRef
) {
	// Convention C-1: the NODE, not a ref. The panel is created by
	// `presence.mounted`, so a `useRef` + `[]`-deps effect would still be
	// holding `null` when the trap's effect fires and the trap would never
	// arm — silently.
	const [panel, setPanelNode] = useElementRef<HTMLDivElement>();

	// Returns the two functions the source hands out through `onActivate`:
	// the eager return, and the re-arm. Two module-level `let`s, two handler
	// functions and an `onActivate` closure collapse to this one line.
	const trap = useFocusTrap(panel, { initialFocus, fallbackFocus });

	const presence = usePresence(open, {
		// The two halves of the focus handshake, at the two moments the source
		// puts them: `onintrostart` → rearm, `onoutrostart` → returnFocusNow.
		//
		// `returnFocusNow` at the dismiss instant is the whole point: waiting
		// for the trap's own `destroy()` would leave a keyboard user on
		// `<body>` for the length of the fade, because the panel is marked
		// `inert` the instant the exit starts.
		//
		// `rearm` is the other half. A dialog reopened DURING its exit
		// reverses instead of remounting, so the trap is never re-created:
		// without this the panel would come back `aria-modal` and interactive
		// with focus left on the trigger behind it, Tab walking the page
		// rather than the panel, and the eager return already spent for the
		// life of the instance.
		onEnterStart: () => trap.rearm(),
		onExitStart: () => trap.returnFocusNow(),
	});

	// Release timing, which is the only reason this is not keyed on `open`:
	// `presence.mounted` stays true for the whole exit, so the page stays
	// locked until the backdrop has actually finished fading instead of
	// unlocking the instant `open` flips and leaving the page scrollable
	// under a scrim still on screen.
	//
	// CONTRACT divergence, recorded in this folder's README: the internals
	// contract's worked example calls a bare `useScrollLock()` here. That is
	// only correct for a component whose own mounting scope IS the surface's,
	// and this one's is not — `Dialog` renders `DialogSurface`
	// unconditionally, exactly as the source does, so a bare call would lock
	// the page for every dialog on the page, open or not. `mounted` is the
	// mounting scope expressed as a boolean; it is emphatically not `open`.
	useScrollLock(presence.mounted);

	// `active: open` — a plain boolean where the source needed `() => open`.
	// The layer stays ON the stack for its whole exit and stops being TOP of
	// it the instant `open` flips, so a second Escape during the fade falls
	// through to whatever is underneath.
	useDismissable(panel, { onDismiss, escape, outsideClick, exclude, active: open });

	// Convention C-2: composed ABOVE any conditional. Calling this inside the
	// JSX branch below would be a conditional hook and would throw the first
	// time `mounted` flips.
	const panelRef = useComposedRefs(
		setPanelNode,
		forwardedRef,
		presence.register("panel", anchored, (entering) => ({
			entering,
			duration: DURATIONS.base,
			exitDuration: DURATIONS.exit,
		}))
	);

	// The scrim fades on opacity alone (`scale: false`) — a full-viewport
	// fixed element has no business acquiring a compositing layer for a
	// transform it does not use. It shares the panel's clock exactly, so the
	// two leave together and the "destroy the subtree when the LAST
	// transition finishes" rule is a tie rather than a straggler.
	const scrimRef = presence.register("scrim", anchored, (entering) => ({
		entering,
		scale: false,
		duration: DURATIONS.base,
		exitDuration: DURATIONS.exit,
	}));

	// CONTRACT divergence, recorded in this folder's README: the `Portal`
	// stays mounted and its CHILDREN are what `presence.mounted` gates,
	// rather than the whole component returning `null`. `usePortalTarget`
	// resolves its container in a layout effect, so a `Portal` that mounts in
	// the same commit as the surface renders nothing on that pass — and the
	// registered nodes therefore do not exist yet when `usePresence`'s own
	// layout effect looks for legs to start, which settles the group
	// immediately and skips the entrance outright. Hoisting the `Portal`
	// above the gate resolves the container once, at this component's mount,
	// so every later open attaches its nodes in the very commit
	// `usePresence` is waiting for.
	return (
		<Portal>
			{presence.mounted ? (
				<>
					<div
						ref={scrimRef}
						className="ft-dialog-scrim fixed inset-0 z-50 bg-black/60"
						aria-hidden="true"
					/>
					{/*
						No portal-before-focus-trap ordering ceremony here (divergence
						D-10): `createPortal` commits children into the container before
						any effect runs and refs populate before layout effects, so the
						node the trap focuses is always connected. The silent-no-op
						`.focus()` hazard the source's comment block warns about cannot
						recur.

						`data-state` is an ordinary attribute (divergence D-2) carrying
						`surfaceState`'s TWO values — never `"opening"` (convention C-5).
						`inert` is not written by hand either: `usePresence` sets it on
						every registered node for the whole exit, which is exactly what
						a closing modal wants.
					*/}
					<div
						ref={panelRef}
						role={role}
						aria-modal="true"
						aria-labelledby={titleId}
						aria-describedby={descriptionId}
						tabIndex={-1}
						data-state={presence.surfaceState}
						className={cn(
							"ft-dialog-panel border-border bg-popover text-popover-foreground fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-y-auto rounded-xl border p-5 shadow-2xl",
							"focus-visible:outline-none",
							panelClass
						)}
					>
						{children}
					</div>
				</>
			) : null}
		</Portal>
	);
});

DialogSurface.displayName = "DialogSurface";
