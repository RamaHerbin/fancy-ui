import { useCallback, useRef } from "react";
import type { Ref, RefCallback } from "react";

/**
 * Non-hook form, for use inside an existing callback ref.
 *
 * Returns the cleanup a React 19 callback ref may hand back, or `undefined`.
 * React 19 runs that cleanup on detach INSTEAD of calling the ref with
 * `null`, so a composer that swallowed the return value would silently drop
 * the consumer's teardown. React 18 has no such channel and ignores whatever
 * a callback ref returns — which is why the value is passed on rather than
 * acted upon here, and why every caller must still be able to cope with a
 * plain `assignRef(ref, null)` detach.
 */
export function assignRef<T>(
	ref: Ref<T> | undefined | null,
	node: T | null
): (() => void) | undefined {
	if (typeof ref === "function") {
		const cleanup = ref(node);
		return typeof cleanup === "function" ? (cleanup as () => void) : undefined;
	}
	if (ref) (ref as { current: T | null }).current = node;
	return undefined;
}

/** Merges any number of refs into one callback ref. Skips nullish entries. */
export function useComposedRefs<T>(...refs: Array<Ref<T> | undefined | null>): RefCallback<T> {
	// The teardown owed for the CURRENT attachment: one entry per incoming
	// ref, either the cleanup that ref returned or a null-write standing in
	// for the one it did not. Held in a ref rather than a closure variable so
	// it survives the composed callback changing identity mid-life, which is
	// exactly when a detach of the old callback is followed by an attach of
	// the new one.
	const pending = useRef<Array<() => void> | null>(null);

	const detach = useCallback(() => {
		const cleanups = pending.current;
		pending.current = null;
		if (!cleanups) return;
		for (const cleanup of cleanups) cleanup();
	}, []);

	// The rest array IS the dependency list: the composed callback's identity
	// changes exactly when one of the incoming refs does, never on every render.
	// A call site always passes the same number of refs, so the list length is
	// stable — which is the one thing a dynamic dependency list must guarantee.
	// `detach` is appended and permanently identity-stable, so the length stays
	// stable too.
	return useCallback<RefCallback<T>>(
		(node) => {
			// React 18 has no ref-cleanup channel: it drops the function we
			// return below and calls us with `null` on detach instead. React 19
			// sees the returned function and calls THAT instead of passing
			// `null`. Both versions therefore funnel through the same `detach`,
			// which is idempotent, so neither can run a cleanup twice nor skip
			// one.
			detach();
			if (node === null) return;
			pending.current = refs.map((ref) => {
				const cleanup = assignRef(ref, node);
				// A ref that returned no cleanup keeps the pre-19 contract: it
				// is cleared by being called with `null`. A ref that DID return
				// one must never also be nulled — running its cleanup is the
				// whole of its teardown.
				return cleanup ?? (() => assignRef(ref, null));
			});
			return detach;
		},
		[...refs, detach]
	);
}
