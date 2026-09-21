import { createInternalContext, type InternalContext } from "../../internals/dom/context.js";

/**
 * Mirrors the Svelte source's `setContext("card3d:mouseEntered", () => isMouseEntered)`:
 * the context value is a getter function itself (not a getter object), read
 * reactively by `CardItem`'s `computed`.
 */
export const CARD3D_CONTEXT: InternalContext<() => boolean> = createInternalContext<() => boolean>("Card3DContext");


/**
 * The fallback `CardItem` uses when no `CardContainer` provides the getter: the
 * pointer has never entered, so the item renders its rest transform. A module
 * constant rather than a fresh closure per item, so the `computed` that reads
 * it keeps a stable dependency.
 */
export const NEVER_ENTERED: () => boolean = () => false;
