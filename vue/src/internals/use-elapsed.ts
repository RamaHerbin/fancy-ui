// Vue bindings for the `createElapsed`/`createNow` state in `elapsed.ts`. The
// factories own the clock; these composables own nothing but starting it once
// the component has mounted and stopping it when the owning scope ends —
// mirroring the source's own usage (`const elapsed = createElapsed(); $effect(() =>
// elapsed.start());`) without leaving the `start()` call to every consumer.

import { onMounted, onScopeDispose } from "vue";
import { createElapsed, createNow } from "./elapsed.js";
import type { ElapsedOptions, ElapsedState, NowState } from "./elapsed.js";

/**
 * `createElapsed`, started on mount and stopped when the scope is disposed.
 *
 * `createElapsed()` runs here, inside `setup()`, which is a render path and
 * runs twice around hydration — so the factory reads no wall clock there
 * (D-V20). With `opts.since` the state is the `NaN`/`""` sentinel until this
 * `onMounted` calls `start()`; without it, `0`/`"0s"` as in the source. Either
 * way the server render and the hydration render agree, and the first real
 * reading lands before the first paint after mount.
 */
export function useElapsed(opts: ElapsedOptions = {}): ElapsedState {
	const elapsed = createElapsed(opts);
	onMounted(() => {
		elapsed.start();
	});
	onScopeDispose(() => elapsed.stop());
	return elapsed;
}

/** `createNow`, started on mount and stopped when the scope is disposed. */
export function useNow(refreshMs = 30_000): NowState {
	const now = createNow(refreshMs);
	onMounted(() => {
		now.start();
	});
	onScopeDispose(() => now.stop());
	return now;
}
