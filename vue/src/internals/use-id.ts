// Ids for components that need to wire up aria-labelledby / aria-describedby
// without colliding across instances.
//
// `useFancyId()` is THE id source a port reaches for. It wraps Vue's own
// `useId()`, so the id is identical in the server render and in the
// hydration render — the counterpart of the Svelte side's `$props.id()`.
// Derive every sub-id by suffixing one seed (`${id}-description`,
// `${id}-error`) rather than calling it once per id.
//
// The output of `useFancyId()` is NOT transformed (convention C-6): no
// prefix is added, unlike the Svelte and React siblings. Vue's generator
// already namespaces per app instance, and a hand-added prefix would be a
// second, unenforced convention. Ids read `v-0`, `v-1`, … — nothing may
// depend on that shape, and no id from here may ever become a CSS selector.
//
// `uid()` — the rare id minted inside an event handler — lives in `./id.js`
// (a byte-identical copy of the Svelte `_internals/id.ts`) and is imported
// from there directly: a re-export here would leave a dangling declaration
// whenever no module in the bundle uses it. CLIENT-ONLY — see that module.

import { useId } from "vue";

/**
 * An SSR-stable id for the calling component instance, e.g. "v-0". Stable
 * across the server render and hydration, and stable for the life of the
 * component. Must be called synchronously in `setup`.
 *
 * Call it once and suffix the result for every id the component needs; a
 * second call is a second seed, not a second id off the same one.
 */
export function useFancyId(): string {
	// Vue 3.5.2 (the peer floor) types `useId()` as possibly undefined — it is
	// only so when called outside `setup`, which Vue already warns about — while
	// later releases type it as `string`. The fallback keeps both floors typed
	// without changing what a correct call returns.
	// Vue 3.5.2 (the peer floor) seeds its ids as `v:0`, later releases as `v-0`.
	// The colon is a legal id character but needs escaping inside a selector,
	// so it is normalised to the dash form: every id this package generates
	// reads `v-N` on every supported Vue, on the server and on the client alike.
	return (useId() ?? "").replace(/:/g, "-");
}
