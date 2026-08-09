// Stable, incrementing id generator shared by components that need to wire
// up aria-labelledby / aria-describedby without colliding across instances.
//
// CLIENT-ONLY: the counter below is module-scoped. On a long-lived
// SvelteKit server it is shared and keeps incrementing across
// concurrent/successive requests, while a freshly loaded client bundle
// always restarts at 1 — so an id generated during SSR will never match
// the id the client regenerates on hydration, producing hydration
// mismatches and unreliable aria wiring. Only call uid() from browser-only
// code paths (onMount, $effect, event handlers), never during
// render/SSR. For ids that must be stable across SSR and hydration, use
// Svelte's built-in `$props.id()` instead.

let n = 0;

/**
 * Returns a unique, stable id string, e.g. "fui-1", "fui-2", ...
 *
 * Client-only: throws when called on the server, since the id produced
 * there would not match the one the client regenerates on hydration. Call
 * this only from browser-only code paths (onMount, $effect, event
 * handlers) — use `$props.id()` for ids that must survive SSR + hydration.
 *
 * @param prefix - Prefix for the generated id (defaults to "fui").
 */
export function uid(prefix = "fui"): string {
	if (typeof window === "undefined") {
		throw new Error(
			"uid() is client-only and must not be called during SSR; use $props.id() for SSR-stable ids.",
		);
	}

	n += 1;
	return `${prefix}-${n}`;
}
