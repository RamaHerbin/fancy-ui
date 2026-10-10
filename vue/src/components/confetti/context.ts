import type { Options as ConfettiOptions } from "canvas-confetti";
import { createInternalContext, type InternalContext } from "../../internals/dom/context.js";

/**
 * Mirrors the Svelte source's `setContext("ConfettiContext", { fire })`: the
 * root canvas publishes its `fire` method so a `ConfettiButton` rendered
 * below it paints onto that canvas rather than the library's own full-page
 * one. Not re-exported from `index.ts` — the Svelte `index.ts` exports only
 * the two components, so the key has no public identity on either side.
 */
export interface ConfettiContextValue {
	fire: (opts?: ConfettiOptions) => void;
}

export const CONFETTI_CONTEXT: InternalContext<ConfettiContextValue> =
	createInternalContext<ConfettiContextValue>("ConfettiContext");
