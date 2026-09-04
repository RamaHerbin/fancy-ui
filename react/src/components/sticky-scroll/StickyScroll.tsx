import { forwardRef, memo, useRef, useState } from "react";
import type { ForwardedRef, HTMLAttributes, ReactElement, ReactNode, RefAttributes } from "react";
import { cn } from "../../utils.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useEventCallback } from "../../internals/dom/use-event-callback.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { observeInView } from "../../internals/motion/in-view.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import { usePresence } from "../../internals/motion/presence.js";
import { preset } from "../../internals/motion/transitions.js";
import { DURATIONS } from "../../internals/motion/tokens.js";
import "./sticky-scroll.css";

interface BaseProps<T> {
	/** The items rendered down the scrolling column, one `item` render per row. */
	items: T[];
	/** Renders one row. `(item, index, active)` — `active` is true only for the current `activeIndex`. */
	item: (item: T, index: number, active: boolean) => ReactNode;
	/** Renders the sticky panel's content for the active item. `(item, index)`. */
	panel: (item: T, index: number) => ReactNode;
	/**
	 * The currently active item's index. Holds its last value when nothing
	 * intersects the centre line. Passing it makes the index controlled — the
	 * React counterpart of the Svelte source's `$bindable`; omit it entirely to
	 * let the component own the index and report every change through `onChange`.
	 */
	activeIndex?: number;
	/** Which logical side the sticky panel sits on. Flips physically under `dir="rtl"` — nothing extra to configure. */
	panelSide?: "start" | "end";
	/** Whether the panel crossfades between items. Effective value is always `false` under reduced motion. */
	crossfade?: boolean;
	/** Additional CSS classes for the sticky panel wrapper. */
	panelClass?: string;
	/** Whether the panel is `aria-hidden` — the default, since it normally mirrors an already-visible active item. Set `false` when the panel holds content found nowhere else. */
	panelHidden?: boolean;
	/** Called when the active index changes — never on every scroll tick, only on an actual change. */
	onChange?: (index: number, item: T) => void;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Props for StickyScroll
 */
export interface StickyScrollProps<T>
	extends Omit<HTMLAttributes<HTMLDivElement>, keyof BaseProps<unknown> | "children">,
		BaseProps<T> {}

// The library's ONE bidirectional preset, reused here for the panel
// crossfade — keeps the timing/easing sourced from the same tokens as every
// other component in the family instead of a second, disconnected
// 400ms/linear default. `usePresence` hands it a real "in"/"out" direction
// per leg, exactly as the source's separate `in:`/`out:` directives did.
const fadePanel = preset("fade");

interface StickyScrollItemProps<T> {
	index: number;
	active: boolean;
	/** The row's own item, and the consumer's renderer for it. The row calls
	 *  the renderer itself rather than receiving a ready-made element, so a
	 *  parent re-render that changes nothing about this row leaves its props
	 *  identical and the memo below holds. */
	value: T;
	item: (item: T, index: number, active: boolean) => ReactNode;
	onActivate: (index: number) => void;
}

/**
 * One row of the scrolling column. A child component because the observer is
 * per-node (`use:inView` was applied per `<section>` in the source), and a
 * hook cannot be called in a loop.
 */
function StickyScrollItemImpl<T>({
	index,
	active,
	value,
	item,
	onActivate,
}: StickyScrollItemProps<T>) {
	// Convention C-1: the primitive takes the NODE, published by `useElementRef`.
	const [node, ref] = useElementRef<HTMLElement>();

	// The framework-free core rather than the `useInView` hook: this row never
	// reads the visible state, and the hook publishes it as component state —
	// so the leaving fire (which deliberately does NOT move the active index)
	// would still commit a render producing identical DOM. The source's
	// `use:inView` action holds no reactive state at all.
	useIsomorphicLayoutEffect(() => {
		if (!node) return;
		const handle = observeInView(node, {
			once: false,
			threshold: 0,
			rootMargin: "-50% 0px -50% 0px",
			onChange: (visible) => {
				if (visible) onActivate(index);
			},
		});
		return () => {
			handle.destroy();
		};
	}, [node, index, onActivate]);

	return (
		<section
			ref={ref}
			className="ft-stickyscroll-item"
			data-index={index}
			data-active={active}
			// React's `onFocus` is delegated through `focusin`, so it bubbles
			// from descendants exactly like the source's `onfocusin`.
			onFocus={() => onActivate(index)}
		>
			{item(value, index, active)}
		</section>
	);
}

/**
 * An activation flips `data-active` on exactly two rows; the source re-runs
 * exactly those two snippets. Memoising the row buys React the same update
 * volume — every other row's props (`value`, `item`, `index`, `active` and the
 * identity-stable `onActivate`) are unchanged, so the consumer's `item` is not
 * re-invoked for them. `memo` erases a render function's type parameter the
 * way `forwardRef` does, so the generic call signature is restored by
 * assertion.
 */
const StickyScrollItem = memo(StickyScrollItemImpl) as typeof StickyScrollItemImpl;

interface PanelFrameProps {
	/** False the instant this frame starts its exit. */
	open: boolean;
	/** True for every frame created by an index change; false only for the
	 *  frame present on the very first render, matching the source rule that a
	 *  local transition never plays on the initial render of its block. */
	appear: boolean;
	/** Read at leg start. `0` is the sampler's own synchronous fast path —
	 *  reduced motion and `crossfade={false}` both collapse to it, no separate
	 *  branch needed. */
	duration: number;
	onExited: () => void;
	children?: ReactNode;
}

/**
 * One keyed panel frame — the counterpart of the source's `{#key panelIndex}`
 * block with `in:`/`out:` on its single child. `usePresence` keeps the node
 * mounted through the whole exit and reports back when the outro has landed,
 * at which point the parent drops the frame from its list.
 */
function PanelFrame({ open, appear, duration, onExited, children }: PanelFrameProps) {
	const presence = usePresence(open, { appear, onExitEnd: onExited });

	if (!presence.mounted) return null;

	return (
		<div ref={presence.register(fadePanel, { duration })} className="ft-stickyscroll-panel-frame">
			{children}
		</div>
	);
}

interface FrameEntry {
	key: number;
	/** True for the single current frame; false while exiting. */
	live: boolean;
	/** An exiting frame's content, captured from the render BEFORE the index
	 *  changed — the React counterpart of Svelte freezing the outgoing keyed
	 *  block's DOM, and what keeps a stale index from re-reading a shrunk
	 *  `items` array. `null` on the live frame, which renders live content. */
	frozen: ReactNode;
	appear: boolean;
}

function StickyScrollImpl<T>(
	props: StickyScrollProps<T>,
	forwardedRef: ForwardedRef<HTMLDivElement>
) {
	const {
		items,
		item,
		panel,
		activeIndex: activeIndexProp,
		panelSide = "end",
		crossfade = true,
		panelClass,
		panelHidden = true,
		onChange,
		className,
		...restProps
	} = props;

	// The Svelte source's `activeIndex` is `$bindable(0)`: a consumer can bind
	// it, or leave it alone and let the component keep writing its own copy.
	// React has no such channel, so the prop is controlled when it is passed
	// and this local copy takes over when it is not. Either way `onChange`
	// fires with the same value.
	const [uncontrolledIndex, setUncontrolledIndex] = useState(0);
	const isControlled = activeIndexProp !== undefined;
	const activeIndex = isControlled ? activeIndexProp : uncontrolledIndex;

	const reduced = useReducedMotion();
	const effectiveCrossfade = crossfade && !reduced;
	const panelDuration = effectiveCrossfade ? DURATIONS.base : 0;

	// Guards two edge cases at once: an empty `items` list (nothing to
	// index), and `activeIndex` drifting out of range if the caller shrinks
	// `items` out from under a value they own. `activeIndex` itself is never
	// silently rewritten here — only the INDEX USED FOR RENDERING the panel is
	// clamped, so a caller reading `activeIndex` back always sees exactly what
	// they (or the last intersection) set.
	const panelIndex =
		items.length > 0 ? Math.min(Math.max(activeIndex, 0), items.length - 1) : 0;

	// Identity-stable, like the source's module-instance `setActive`: a row
	// that receives it as a prop is not re-rendered just because the parent
	// re-rendered, and the observer effect below does not re-observe.
	const setActive = useEventCallback((i: number) => {
		if (activeIndex === i) return;
		if (!isControlled) setUncontrolledIndex(i);
		onChange?.(i, items[i] as T);
	});

	// ---- the `{#key panelIndex}` machinery -------------------------------
	const [frames, setFrames] = useState<FrameEntry[]>(() => [
		{ key: 0, live: true, frozen: null, appear: false },
	]);
	/** The panel content as of the last COMMITTED render — what an exiting
	 *  frame freezes, since by the time the change is detected `items` has
	 *  already moved on. Written after the commit, never during render, so a
	 *  render React starts and throws away leaves nothing behind. */
	const lastPanelNode = useRef<ReactNode>(null);
	const [prevPanelIndex, setPrevPanelIndex] = useState(panelIndex);

	// Detected during render (a render-phase state update, which React applies
	// before committing), not in an effect: the swap must land in the same
	// commit as the index change, exactly as the keyed block does. The
	// previous index is STATE, not a ref: React discards a thrown-away
	// render's state updates but not its ref writes, so a ref here would let
	// an abandoned render consume the change and silently drop the crossfade.
	// The new frame's key is derived inside the updater from the frames it
	// already holds, for the same reason.
	if (prevPanelIndex !== panelIndex) {
		setPrevPanelIndex(panelIndex);
		const frozen = lastPanelNode.current;
		setFrames((current) => [
			...current.filter((f) => !f.live),
			...current.filter((f) => f.live).map((f) => ({ ...f, live: false, frozen })),
			{
				key: current.reduce((highest, f) => Math.max(highest, f.key), 0) + 1,
				live: true,
				frozen: null,
				appear: true,
			},
		]);
	}

	const liveNode = items.length > 0 ? panel(items[panelIndex] as T, panelIndex) : null;

	// Every commit, no dependency list: the snapshot an exiting frame freezes
	// is by definition "whatever the panel rendered last time it landed".
	useIsomorphicLayoutEffect(() => {
		lastPanelNode.current = liveNode;
	});

	return (
		// Exactly two children live directly under `.ft-stickyscroll`: the
		// items column and the panel. One wrapping flex line does BOTH layout
		// jobs — two side-by-side columns when the container fits both, or two
		// full-width rows when it doesn't — with no breakpoint to keep in
		// sync: each child asks for a 20rem basis and they wrap when the pair
		// (plus the real gap) no longer fits. That wrap is also what gives the
		// panel real sticky travel once stacked, since a flex item's
		// containing block is the whole container's content box (see the
		// stylesheet).
		<div
			ref={forwardedRef}
			className={cn("ft-stickyscroll", className)}
			{...restProps}
			data-panel-side={panelSide}
		>
			<div className="ft-stickyscroll-items">
				{items.map((it, i) => (
					<StickyScrollItem
						key={i}
						index={i}
						active={i === activeIndex}
						value={it}
						item={item}
						onActivate={setActive}
					/>
				))}
			</div>

			{items.length > 0 ? (
				<div
					className={cn("ft-stickyscroll-panel", panelClass)}
					aria-hidden={panelHidden ? "true" : undefined}
				>
					{frames.map((f) => (
						<PanelFrame
							key={f.key}
							open={f.live}
							appear={f.appear}
							duration={panelDuration}
							onExited={() => setFrames((current) => current.filter((x) => x.key !== f.key))}
						>
							{f.live ? liveNode : f.frozen}
						</PanelFrame>
					))}
				</div>
			) : null}
		</div>
	);
}

/** Keeps the source's generic surface: a consumer imports the props as
 *  `StickyScrollProps<MyItem>`, and the component infers `T` from whatever
 *  `items` it's actually given. `forwardRef` erases a render function's type
 *  parameter, so the generic call signature is restored by assertion. */
type StickyScrollComponent = <T>(
	props: StickyScrollProps<T> & RefAttributes<HTMLDivElement>
) => ReactElement;

const StickyScrollForwarded = forwardRef(
	StickyScrollImpl as (
		props: StickyScrollProps<unknown>,
		ref: ForwardedRef<HTMLDivElement>
	) => ReactElement
);
StickyScrollForwarded.displayName = "StickyScroll";

export const StickyScroll = StickyScrollForwarded as unknown as StickyScrollComponent;
