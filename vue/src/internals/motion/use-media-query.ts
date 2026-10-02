import { computed, onMounted, onScopeDispose, type Ref } from "vue";
import { createMediaQuery, REDUCED_MOTION_QUERY } from "./media-query.js";

/**
 * `matchMedia` as a readonly ref. Returns `fallback` on the server AND
 * through the hydration render — the query is only ever started from
 * `onMounted`, which runs after the DOM has been created (or hydrated) and
 * never on the server, so there is no window in which a server-rendered
 * value and a client-computed value could disagree (C-7).
 */
export function useMediaQuery(query: string, fallback = false): Readonly<Ref<boolean>> {
	const state = createMediaQuery(query, fallback);
	const current = computed(() => state.current);

	onMounted(() => {
		const stop = state.start();
		onScopeDispose(stop);
	});

	return current;
}

/** `useMediaQuery(REDUCED_MOTION_QUERY, false)` — reduced motion is never
 * assumed before the browser has actually been asked. */
export function useReducedMotion(): Readonly<Ref<boolean>> {
	return useMediaQuery(REDUCED_MOTION_QUERY, false);
}
