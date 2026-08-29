import { useInsertionEffect, useRef } from "react";

/**
 * A read-only ref mirroring `value`, written in `useInsertionEffect` for the same
 * reason as `useEventCallback`. The React counterpart of a Svelte getter for a
 * NON-callback value: a long-lived closure (a document listener, an observer
 * callback, a stack entry) reads `ref.current` and sees the latest render's value
 * without being rebuilt.
 */
export function useLiveRef<T>(value: T): { readonly current: T } {
	const ref = useRef<T>(value);

	useInsertionEffect(() => {
		ref.current = value;
	}, [value]);

	return ref;
}
