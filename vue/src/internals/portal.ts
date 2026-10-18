// Resolves a portal target argument to an actual element. Framework-free —
// verbatim from React's `Portal.tsx`, which already carries this in the
// browser-only shape both trees need. Vue's `<Teleport>` accepts a target
// string directly, so `Portal.vue` reaches for this only when it needs the
// resolved element (a real `HTMLElement`, never a bare selector) as a
// fallback: an unmatched selector falls back to `document.body`.

/**
 * Resolves a portal target argument to an actual element.
 * Falls back to `document.body` when a string selector matches nothing.
 */
export function resolvePortalTarget(target?: HTMLElement | string): HTMLElement {
	if (target instanceof HTMLElement) {
		return target;
	}

	if (typeof target === "string") {
		const match = document.querySelector<HTMLElement>(target);
		if (match) {
			return match;
		}
	}

	return document.body;
}
