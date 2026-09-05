/**
 * The contract `Confetti` publishes to the buttons rendered inside it.
 *
 * The Svelte source keys this on the string `"ConfettiContext"` via
 * `setContext` / `getContext`; React's own context object plays that role
 * here. It is deliberately NOT re-exported from `index.ts` — the Svelte
 * `index.ts` exports only the two components, so the key has no public
 * identity on either side.
 */

import type { Options as ConfettiOptions } from "canvas-confetti";
import { createInternalContext } from "../../internals/dom/context.js";

/** What the canvas root publishes: the one imperative method its children call. */
export interface ConfettiContextValue {
	/** Fire the shared canvas instance, merging `opts` over the root's own `options`. */
	fire: (opts?: ConfettiOptions) => void;
}

/**
 * Read with `ConfettiReactContext.useOptional()` — a `ConfettiButton` rendered
 * outside a `Confetti` gets `undefined` and falls back to the module-level
 * confetti, exactly as `getContext` returning `undefined` does on the Svelte side.
 */
export const ConfettiReactContext = createInternalContext<ConfettiContextValue>("ConfettiContext");
