/**
 * Calls a callback prop that may arrive as a single function or as an array of
 * functions. Vue merges a listener attached at two levels (a wrapper component
 * and its parent both writing `@click` on the same root) into an array, so a
 * declared `onClick` prop cannot assume it holds one function.
 *
 * For an array whose first argument is an Event, an earlier handler calling
 * `event.stopImmediatePropagation()` stops the later ones, matching Vue's own
 * DOM listener invoker.
 */
export function callListener<A extends unknown[]>(
	listener: ((...args: A) => void) | ((...args: A) => void)[] | undefined,
	...args: A
): void {
	if (!listener) return;
	if (Array.isArray(listener)) {
		const event = args[0];
		if (!(event instanceof Event)) {
			for (const fn of listener) if (typeof fn === "function") fn(...args);
			return;
		}
		let stopped = false;
		const hadOwn = Object.prototype.hasOwnProperty.call(event, "stopImmediatePropagation");
		const original = event.stopImmediatePropagation;
		event.stopImmediatePropagation = () => {
			original.call(event);
			stopped = true;
		};
		try {
			for (const fn of listener) {
				if (stopped) break;
				if (typeof fn === "function") fn(...args);
			}
		} finally {
			if (hadOwn) event.stopImmediatePropagation = original;
			else delete (event as { stopImmediatePropagation?: unknown }).stopImmediatePropagation;
		}
		return;
	}
	if (typeof listener === "function") listener(...args);
}
