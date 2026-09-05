import { useCallback, useState } from "react";
import type { RefCallback } from "react";

/**
 * The node, and the callback ref that publishes it. THE way a component hands an
 * element to an internals hook (convention C-1).
 *
 * Returns state, not a ref, so a hook keyed on `[node]` re-runs the moment the node
 * appears — which is the only correct behaviour for a node whose existence is
 * conditional (a presence-mounted panel, an `{#if}`-equivalent branch). The setter
 * identity is stable for the life of the component.
 */
export function useElementRef<T extends Element = HTMLElement>(): [T | null, RefCallback<T>] {
	const [node, setNode] = useState<T | null>(null);

	// Block body, never a concise arrow: React 19 reads a returned value as a
	// cleanup function (convention C-3). The `[]` deps keep the identity stable
	// for the life of the component, so React never detaches and reattaches.
	const ref = useCallback<RefCallback<T>>((next) => {
		setNode(next);
	}, []);

	return [node, ref];
}
