import { useCallback } from "react";
import type { Ref, RefCallback } from "react";

/** Non-hook form, for use inside an existing callback ref. */
export function assignRef<T>(ref: Ref<T> | undefined | null, node: T | null): void {
	if (typeof ref === "function") ref(node);
	else if (ref) (ref as { current: T | null }).current = node;
}

/** Merges any number of refs into one callback ref. Skips nullish entries. */
export function useComposedRefs<T>(...refs: Array<Ref<T> | undefined | null>): RefCallback<T> {
	// The rest array IS the dependency list: the composed callback's identity
	// changes exactly when one of the incoming refs does, never on every render.
	// A call site always passes the same number of refs, so the list length is
	// stable — which is the one thing a dynamic dependency list must guarantee.
	return useCallback<RefCallback<T>>((node) => {
		for (const ref of refs) assignRef(ref, node);
	}, refs);
}
