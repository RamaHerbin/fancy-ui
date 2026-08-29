import { createElement, forwardRef, useEffect, useRef, useState } from "react";
import type { CSSProperties, FocusEvent, HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useEventCallback } from "../../internals/dom/use-event-callback.js";
import { observeInView } from "../../internals/motion/in-view.js";
import { staggerDelay } from "../../internals/motion/stagger.js";
import { STAGGER_CAPS } from "../../internals/motion/tokens.js";
import type { RevealPresetName, StaggerFrom } from "../../internals/motion/types.js";
import "./reveal.css";

export interface RevealProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
	/** Which of the six directional/scale looks to animate with. */
	preset?: RevealPresetName;
	/** What starts the reveal. `"view"` watches the viewport, `"mount"` fires on the next frame, `"manual"` follows the `active` prop. */
	trigger?: "view" | "mount" | "manual";
	/** Read only when `trigger="manual"` — `true` reveals, `false` re-arms. */
	active?: boolean;
	/** Disconnects the observer after the first reveal. `false` re-arms (and re-hides, unless reduced motion) every time the node leaves the viewport. Only meaningful for `trigger="view"`. */
	once?: boolean;
	/** IntersectionObserver threshold. Only meaningful for `trigger="view"`. */
	threshold?: number;
	/** IntersectionObserver rootMargin. Only meaningful for `trigger="view"`. */
	rootMargin?: string;
	/** Entrance duration in ms. */
	duration?: number;
	/** Delay before the entrance starts, in ms. */
	delay?: number;
	/** CSS easing for the entrance. */
	easing?: string;
	/** Travel distance in px for the four directional presets — ignored by `scale`. */
	distance?: number;
	/** ms per stagger step. `0` (default) animates the root itself; any positive value switches to animating direct element children instead, each offset by its own computed delay. */
	stagger?: number;
	/** Where the stagger counts distance from. Only meaningful when `stagger > 0`. */
	from?: StaggerFrom;
	/** How the very first server-rendered paint looks. `"hidden"` (the default) starts at `data-state="armed"`, so the content is already hidden before hydration and there is no flash — at the cost of staying hidden on a page that never hydrates (the CSS is gated on `(scripting: enabled)`, which reflects the browser, not this page). `"visible"` starts at the pre-mount `"idle"` state, which paints fully visible; the mount effect then flips it to `"armed"` (an instant hide, no fade-out) and the reveal plays from there. Use it for content that must be readable with JS off or on a `csr = false` route, and accept a one-frame flash. See the README's SSR section. */
	initial?: "hidden" | "visible";
	/** The element tag Reveal renders as. */
	as?: keyof HTMLElementTagNameMap;
	/** Fires once per reveal, the moment the state machine reaches `"visible"` — including every re-reveal when `once={false}`. */
	onReveal?: () => void;
	children: ReactNode;
}

// Named so the render's conditional inline-var writes can compare a caller's
// value against the shipped default and skip the inline write when they
// match — the same technique Pressable's `DEFAULT_SCALE` and Magnetic's
// `DEFAULT_RADIUS` already use. This is what keeps the CSS fallback chain
// (in reveal.css) actually reachable: an inline style always wins over a
// stylesheet, so writing these vars unconditionally would make
// `--ft-reveal-duration` etc. un-themeable no matter what the CSS said.
const DEFAULT_DURATION = 600; // tokens.DURATIONS.entrance
const DEFAULT_DELAY = 0;
const DEFAULT_EASING = "cubic-bezier(0.16, 1, 0.3, 1)"; // tokens.EASINGS.out
const DEFAULT_DISTANCE = 16;

export const Reveal = forwardRef<HTMLElement, RevealProps>(function Reveal(
	{
		preset = "fade-up",
		trigger = "view",
		active = false,
		once = true,
		threshold = 0.1,
		rootMargin = "0px 0px -10% 0px",
		duration = DEFAULT_DURATION,
		delay = DEFAULT_DELAY,
		easing = DEFAULT_EASING,
		distance = DEFAULT_DISTANCE,
		stagger = 0,
		from = "first",
		initial = "hidden",
		as = "div",
		onReveal,
		onFocus,
		className,
		style,
		children,
		...restProps
	},
	forwardedRef
) {
	const [node, nodeRef] = useElementRef<HTMLElement>();
	const composedRef = useComposedRefs(forwardedRef, nodeRef);

	// The 3-state machine (idle → armed → visible) exists so SSR/pre-hydration
	// content has a stable, honest name for "nothing has run yet" (idle) that
	// is distinct from "the observer is attached and waiting" (armed) — see
	// the Svelte source's README SSR section for why `initial` picks the
	// STARTING value here rather than a fixed constant. Only `armed` is hidden
	// by the CSS: `idle` paints visible, which is exactly what
	// `initial="visible"` buys (content readable before hydration, with a
	// one-frame flash when the mount effect arms it), and `armed` is what
	// `initial="hidden"` starts from (no flash, hidden until the reveal
	// fires). The lazy initializer is deliberately one-shot (the starting
	// value only) — a LATER change to the `initial` prop must not reset an
	// already-running reveal back to a pre-mount state.
	const [state, setState] = useState<"idle" | "armed" | "visible">(() =>
		initial === "hidden" ? "armed" : "idle"
	);
	// Mirror of `state` for the stable callbacks below: `markVisible`'s
	// "fire onReveal once per reveal" guard must read the CURRENT state from
	// inside long-lived observer/rAF closures, not the render that created
	// them.
	const stateRef = useRef(state);
	function commitState(next: "idle" | "armed" | "visible") {
		stateRef.current = next;
		setState(next);
	}

	const emitReveal = useEventCallback(onReveal);

	const markVisible = useEventCallback(() => {
		if (stateRef.current !== "visible") {
			commitState("visible");
			emitReveal();
		}
	});

	// Only meaningful for trigger="view" with once=false: drop back to
	// "armed" (never all the way to "idle" — idle is a pre-mount-only value)
	// so the CSS hidden styling reapplies and a later re-intersection reveals
	// again.
	//
	// Guarded by focus: a keyboard user tabbing through a long, still-visible
	// section can land focus inside this node and THEN have it leave the
	// viewport underneath them (trigger="view" + once=false) or have
	// `active` flip false (trigger="manual") — re-hiding at that moment
	// would fade content to opacity:0 with the caret still inside it.
	// `handleFocusIn` below only protects a user ARRIVING at hidden content;
	// this guard protects one who is already inside when a re-hide would
	// otherwise fire. `document` is guarded defensively even though this is
	// only ever reached from a browser event/effect (never during SSR).
	const markArmed = useEventCallback(() => {
		if (node && typeof document !== "undefined" && node.contains(document.activeElement)) return;
		commitState("armed");
	});

	// Runs exactly once, regardless of any prop changing later — the
	// idle→armed flip is a one-time mount bookkeeping step, not something
	// that should re-fire (or, worse, re-run every time `state` changes
	// afterward, which listing `state` as a dependency of an effect that also
	// WRITES it would do).
	useEffect(() => {
		if (stateRef.current === "idle") commitState("armed");
		// eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot mount bookkeeping
	}, []);

	// trigger="view": the IntersectionObserver path. Keyed on the node itself
	// (convention C-1) plus the observer's real inputs; `markVisible` and
	// `markArmed` are identity-stable, so this rebuilds exactly when the
	// Svelte $effect would.
	useEffect(() => {
		if (trigger !== "view" || !node) return;
		const handle = observeInView(node, {
			once,
			threshold,
			rootMargin,
			onChange: (inViewNow) => {
				if (inViewNow) markVisible();
				else if (!once) markArmed();
			},
		});
		return () => handle.destroy();
	}, [trigger, node, once, threshold, rootMargin, markVisible, markArmed]);

	// trigger="mount": reveal on the next animation frame after mount, so
	// the hidden→visible transition actually has a "from" frame to start
	// from instead of painting already-visible on the very first frame.
	useEffect(() => {
		if (trigger !== "mount" || !node) return;
		let cancelled = false;
		const raf = requestAnimationFrame(() => {
			if (!cancelled) markVisible();
		});
		return () => {
			cancelled = true;
			cancelAnimationFrame(raf);
		};
	}, [trigger, node, markVisible]);

	// trigger="manual": data-state mirrors `active` directly, every time
	// either prop changes. Never re-enters "idle".
	useEffect(() => {
		if (trigger !== "manual") return;
		if (active) markVisible();
		else markArmed();
	}, [trigger, active, markVisible, markArmed]);

	// A keyboard user can Tab into content that LOOKS invisible (opacity: 0
	// is still focusable — the frozen contract forbids visibility/display
	// specifically so hidden content never leaves the tab order). Revealing
	// on focusin means hidden content never has to be reached blind. This
	// runs regardless of `trigger`, including "manual": if a manual reveal's
	// `active` is still false when focus arrives, focusin wins and shows the
	// content anyway — there's no accessible reason to make a keyboard user
	// wait for an external toggle a mouse user never had to wait for either.
	// React's `onFocus` is delivered via the native `focusin` event, so this
	// is the same bubbling listener the Svelte source attaches.
	function handleFocusIn(event: FocusEvent<HTMLElement>) {
		markVisible();
		// `onFocus` is pulled out of `restProps` (see the props destructure
		// above) specifically so a caller's own handler still runs — leaving
		// it inside `restProps` would let this component's own `onFocus`
		// silently win the spread (restProps is spread before this attribute,
		// see below) and discard the caller's.
		onFocus?.(event);
	}

	// Stagger: only when stagger > 0. Walks the DIRECT ELEMENT children
	// (bare text nodes can't carry a CSS custom property) and writes each
	// one's computed delay as an inline var, re-indexing whenever the child
	// list itself changes (a list growing, for instance) via
	// MutationObserver — a static :nth-child sheet (see blur-reveal, this
	// component's predecessor) can never do this for an arbitrary/changing
	// child count.
	//
	// `SVGElement` is accepted alongside `HTMLElement` because the stagger CSS
	// targets EVERY direct element child (`> *`): a row of bare `<svg>` icons
	// is a real, common case, and an `instanceof HTMLElement`-only walk would
	// animate each icon (the CSS matched) while leaving every one of them on
	// the 0ms fallback delay — the whole row arriving at once. Both
	// interfaces expose `style`, which is all this needs.
	useEffect(() => {
		if (stagger <= 0 || !node) return;
		const root = node;

		function apply() {
			const kids = Array.from(root.children).filter(
				(el): el is HTMLElement | SVGElement =>
					(el instanceof HTMLElement || el instanceof SVGElement) &&
					!el.hasAttribute("data-reveal-skip")
			);
			for (const [i, kid] of kids.entries()) {
				const ms = staggerDelay(i, kids.length, stagger, from, STAGGER_CAPS.item);
				kid.style.setProperty("--ft-reveal-child-delay", `${ms}ms`);
			}
		}

		apply();
		const observer = new MutationObserver(apply);
		observer.observe(root, { childList: true });
		return () => {
			observer.disconnect();
			// Stagger dropping back to 0 (or the component unmounting) leaves
			// this var behind otherwise — harmless today (the CSS only reads
			// it under `[data-stagger]`), but it's state this component wrote
			// and no longer owns once the effect that set it tears down.
			for (const el of Array.from(root.children)) {
				if (el instanceof HTMLElement || el instanceof SVGElement) {
					el.style.removeProperty("--ft-reveal-child-delay");
				}
			}
		};
	}, [node, stagger, from]);

	// Written only when the caller's value differs from the shipped default —
	// see the DEFAULT_* comment above. Vars land AFTER the caller's `style`
	// so they win, matching Svelte's style: directives beating the style
	// attribute.
	const vars: Record<string, string> = {};
	if (duration !== DEFAULT_DURATION) vars["--ft-reveal-duration"] = `${duration}ms`;
	if (delay !== DEFAULT_DELAY) vars["--ft-reveal-delay"] = `${delay}ms`;
	if (easing !== DEFAULT_EASING) vars["--ft-reveal-easing"] = easing;
	if (distance !== DEFAULT_DISTANCE) vars["--ft-reveal-distance"] = `${distance}px`;

	return createElement(
		as,
		{
			...restProps,
			ref: composedRef,
			className: cn("ft-reveal", className),
			"data-state": state,
			"data-preset": preset,
			"data-stagger": stagger > 0 ? "" : undefined,
			style: { ...style, ...vars } as CSSProperties,
			onFocus: handleFocusIn,
		},
		children
	);
});
