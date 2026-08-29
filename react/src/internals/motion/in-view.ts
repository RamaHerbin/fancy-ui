/**
 * The primitive every "reveal on scroll" / "notice when visible" component in
 * this family uses instead of hand-rolling its own IntersectionObserver.
 * Four components elsewhere in this library (blur-reveal, box-reveal,
 * line-reveal, number-ticker) each carry a near-identical
 * `new IntersectionObserver(...)` block, differing only in whether they
 * honour `once: false` and whether `root`/`rootMargin` are exposed at all —
 * this is the single, parameterized version those four independently
 * reinvented, written once for the ten components that need it here.
 *
 * Two layers, as everywhere in `internals/`: `observeInView(node, options)` is
 * the framework-free core (its own suite drives it directly against a
 * hand-built node, no React), and `useInView(node, options)` is the hook the
 * components use.
 */

import { useRef, useState } from "react";
import { useIsomorphicLayoutEffect } from "../dom/ssr.js";
import { useEventCallback } from "../dom/use-event-callback.js";
import { useLiveRef } from "../dom/use-live-ref.js";

export interface InViewOptions {
	/** Disconnect after the first time the node becomes visible. Default true. */
	once?: boolean;
	/** IntersectionObserver threshold(s). Default 0.1. */
	threshold?: number | number[];
	/** IntersectionObserver rootMargin. Default "0px". */
	rootMargin?: string;
	/** IntersectionObserver root. Default null (the viewport). */
	root?: Element | Document | null;
	/** Called with the current intersecting state on every observer callback. */
	onChange: (inView: boolean, entry?: IntersectionObserverEntry) => void;
}

/** What `observeInView` hands back. `update()` swaps the live options in
 * place; `destroy()` disconnects for good. */
export interface InViewHandle {
	update(options: InViewOptions): void;
	destroy(): void;
}

const DEFAULT_THRESHOLD = 0.1;
const DEFAULT_ROOT_MARGIN = "0px";

function observerInit(options: InViewOptions): IntersectionObserverInit {
	return {
		threshold: options.threshold ?? DEFAULT_THRESHOLD,
		rootMargin: options.rootMargin ?? DEFAULT_ROOT_MARGIN,
		root: options.root ?? null,
	};
}

/** Whether two option sets would produce the SAME IntersectionObserver
 * constructor arguments — the only thing that actually requires tearing
 * down and rebuilding the observer (see `update()` below). */
function sameObserverInit(a: InViewOptions, b: InViewOptions): boolean {
	const ia = observerInit(a);
	const ib = observerInit(b);
	return (
		JSON.stringify(ia.threshold) === JSON.stringify(ib.threshold) &&
		ia.rootMargin === ib.rootMargin &&
		ia.root === ib.root
	);
}

function noop(): void {}

export function observeInView(node: Element, opts: InViewOptions): InViewHandle {
	if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
		// SSR, or a browser old enough to lack IntersectionObserver entirely:
		// report visible immediately rather than leaving the caller's content
		// stuck in whatever "not yet revealed" state it renders by default —
		// failing visible beats failing invisible for a real reader on a real
		// page. There is nothing to tear down, so `update`/`destroy` are inert.
		opts.onChange(true);
		return { update: noop, destroy: noop };
	}

	// The observer callback reads through `current`, not the `opts` closed
	// over above — so swapping in a new `onChange` (or flipping `once`) via
	// update() takes effect on the observer's NEXT fire without needing to
	// disconnect and recreate it.
	let current = opts;
	let observer: IntersectionObserver | undefined;
	// A real IntersectionObserver keeps no "have I already fired" state a
	// caller can inspect — disconnecting it just stops callbacks. So when
	// `once: true` has already delivered its one `onChange(true)` and
	// disconnected, that fact lives ONLY in this flag, not in the (now gone)
	// observer instance. Without it, a later `update()` that changes
	// threshold/rootMargin/root — a reactive prop on the consuming
	// component, not a static one — rebuilds a brand-new observer that knows
	// nothing about the earlier fire, re-observes the (already revealed)
	// node, and delivers a SECOND `onChange(true)` the moment it next
	// intersects. `firedOnce` survives every rebuild and makes `build()` a
	// no-op once set, so "once" really does mean once for the lifetime of
	// this handle.
	let firedOnce = false;

	function build(o: InViewOptions) {
		observer?.disconnect();
		observer = undefined;
		if (firedOnce) return;
		observer = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				current.onChange(entry.isIntersecting, entry);
				if (entry.isIntersecting && (current.once ?? true)) {
					firedOnce = true;
					observer?.disconnect();
					observer = undefined;
				}
			}
		}, observerInit(o));
		observer.observe(node);
	}

	build(current);

	return {
		update(newOpts: InViewOptions) {
			// threshold/rootMargin/root are the IntersectionObserver's own
			// constructor arguments — only changing one of those needs a real
			// new observer. `once`/`onChange` are read fresh off `current`
			// every fire, so they never trigger a rebuild: a component that
			// passes an inline `onChange` closure creates a new function
			// identity on every render, and re-observing for that alone would
			// throw away more than intended. When a rebuild IS needed after
			// `once: true` has already fired, `build()`'s own `firedOnce`
			// check (above) keeps it a no-op rather than re-observing and
			// risking a second `onChange(true)`.
			const needsRebuild = !sameObserverInit(current, newOpts);
			current = newOpts;
			if (needsRebuild) build(newOpts);
		},
		destroy() {
			observer?.disconnect();
		},
	};
}

export interface UseInViewOptions extends Omit<InViewOptions, "onChange"> {
	/** Optional here (it is required on the core): the hook already returns the
	 * state, so a consumer only supplies this when it needs the entry itself. */
	onChange?: InViewOptions["onChange"];
	/** `false` observes nothing at all. Default true. */
	enabled?: boolean;
}

/**
 * Returns whether `node` is currently intersecting, and forwards every
 * observer fire to `onChange`.
 *
 * Takes the NODE, not a ref (convention C-1): a node created by a conditional
 * or by a presence-gated subtree is still `null` when a `[]`-deps effect
 * fires, and that effect never re-runs.
 *
 * A LAYOUT effect, not a passive one: the no-IntersectionObserver branch calls
 * `onChange(true)` synchronously, and a passive effect would paint one frame
 * of hidden content before the fail-visible answer landed. Constructing the
 * observer costs nothing measurable.
 *
 * The dependency array is exactly the core's own rebuild rule: `threshold`,
 * `rootMargin` and `root` are the observer's constructor arguments and force a
 * new one; `once` and `onChange` are read live on every fire and must NOT —
 * an inline `onChange` closure changes identity every render, and re-observing
 * for that alone would throw away more than intended. `firedOnce` lives in a
 * ref so it survives a rebuild but not an unmount, matching the core handle's
 * per-instance lifetime.
 *
 * SSR: `false`, matching an un-run observer. A consumer that needs the
 * revealed state in the server HTML uses the `initial="visible"` pattern
 * `Reveal` already has.
 */
export function useInView(node: Element | null, options: UseInViewOptions = {}): boolean {
	const { once, threshold, rootMargin, root, enabled = true, onChange } = options;

	const [inView, setInView] = useState(false);
	const onceRef = useLiveRef(once);
	const handleChange = useEventCallback(onChange);
	const firedOnce = useRef(false);

	// `threshold` is legitimately an array, so its identity is not a usable
	// dependency; the core compares the same way, through JSON.
	const thresholdKey = JSON.stringify(threshold ?? DEFAULT_THRESHOLD);

	useIsomorphicLayoutEffect(() => {
		if (!node || !enabled) return;
		// The core's own post-fire rule, hoisted to hook scope so a rebuild
		// (a changed threshold/rootMargin/root) cannot re-observe an element
		// whose single `once` fire has already been delivered.
		if (firedOnce.current) return;

		const handle = observeInView(node, {
			// A getter, not a captured value: `once` is read off this object on
			// every fire, so flipping it takes effect without a rebuild.
			get once() {
				return onceRef.current;
			},
			threshold,
			rootMargin,
			root,
			// Rest args, forwarded as received: the fail-visible branch calls
			// `onChange(true)` with ONE argument, and re-expanding it to
			// `(visible, entry)` would hand the consumer an explicit
			// `undefined` second argument the core never sent.
			onChange: (...args) => {
				const [visible] = args;
				setInView(visible);
				if (visible && (onceRef.current ?? true)) firedOnce.current = true;
				handleChange(...args);
			},
		});

		return () => {
			handle.destroy();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- `threshold` is
		// covered by `thresholdKey`; `once`/`onChange` are live by design.
	}, [node, enabled, thresholdKey, rootMargin, root]);

	return inView;
}
