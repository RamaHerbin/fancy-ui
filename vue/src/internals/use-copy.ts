// Vue binding for the `createCopy` state in `clipboard.ts`. The factory owns
// the flag and the reset timer; this file owns nothing but wiring its
// teardown to the consumer's scope, the direct analogue of the source's
// "call `destroy()` from the consumer's teardown".

import { onScopeDispose } from "vue";
import { createCopy } from "./clipboard.js";
import type { CopyState } from "./clipboard.js";

/**
 * What `useCopy` hands back: the factory's surface minus `destroy()`, which
 * the composable owns (D-V12). Calling it from outside would cancel a reset
 * the scope is still relying on.
 */
export type UseCopyState = Omit<CopyState, "destroy">;

/** Copy-to-clipboard state, disposed automatically when the owning scope ends. */
export function useCopy(resetMs = 2000): UseCopyState {
	const state = createCopy(resetMs);
	onScopeDispose(() => state.destroy());
	return {
		get copied() {
			return state.copied;
		},
		copy: state.copy,
	};
}
