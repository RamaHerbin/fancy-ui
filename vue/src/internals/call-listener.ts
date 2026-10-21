/**
 * Calls a callback prop that may arrive as a single function or as an array of
 * functions. Vue merges a listener attached at two levels (a wrapper component
 * and its parent both writing `@click` on the same root) into an array, so a
 * declared `onClick` prop cannot assume it holds one function.
 */
export function callListener<A extends unknown[]>(
	listener: ((...args: A) => void) | ((...args: A) => void)[] | undefined,
	...args: A
): void {
	if (!listener) return;
	if (Array.isArray(listener)) {
		for (const fn of listener) if (typeof fn === "function") fn(...args);
		return;
	}
	if (typeof listener === "function") listener(...args);
}
