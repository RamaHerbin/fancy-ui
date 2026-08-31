import { useCallback, useRef } from "react";
import type { RefCallback } from "react";
import { useIsomorphicLayoutEffect } from "./ssr.js";
import { useLiveRef } from "./use-live-ref.js";

/**
 * Keeps the `inert` ATTRIBUTE on an element in sync with a boolean, imperatively.
 *
 * Not a JSX prop, because there is no spelling of one that works across this
 * package's peer range: `inert={true}` is dropped with a warning by React 18
 * (which knows no such attribute and refuses to guess), and `inert=""` is
 * rejected by React 19 (which knows it as a boolean). The attribute itself is
 * what `:not([inert])` selectors and assistive technology key on, so it is
 * written straight to the node instead — one mechanism, identical output on 18
 * and 19.
 *
 * The returned callback ref is identity-stable, so React never detaches and
 * reattaches it; it applies the current value the instant a node arrives (which
 * is what covers a node that REMOUNTS while the flag is unchanged), and the
 * layout effect applies every later change to the node already held. Layout, not
 * passive: inertness that lands a frame late is a frame in which a collapsed
 * region is still clickable and still reachable by Tab.
 *
 * Compose it with `useComposedRefs` when the element already has a ref.
 *
 * SSR: an element is never inert in the server HTML — an attribute this hook
 * writes at commit cannot exist before hydration. Divergence from the Svelte
 * source, which SSRs `inert` inline; observable only in the pre-hydration frame.
 */
export function useInertAttribute<T extends Element = HTMLElement>(inert: boolean): RefCallback<T> {
	const nodeRef = useRef<T | null>(null);
	const inertRef = useLiveRef(inert);

	// Block body, never a concise arrow: React 19 reads a returned value as a
	// cleanup function (convention C-3), and `toggleAttribute` returns a boolean.
	const ref = useCallback<RefCallback<T>>(
		(node) => {
			nodeRef.current = node;
			if (node) node.toggleAttribute("inert", inertRef.current);
		},
		[inertRef]
	);

	useIsomorphicLayoutEffect(() => {
		nodeRef.current?.toggleAttribute("inert", inert);
	}, [inert]);

	return ref;
}
