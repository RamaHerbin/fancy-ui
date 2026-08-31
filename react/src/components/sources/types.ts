/**
 * The contract between the sources root and its parts.
 *
 * `Sources` publishes a live, read-only view of the citation set it holds, plus
 * the one function that changes anything about it. Every part reads it through
 * context rather than having the same values threaded back down as props, so a
 * trigger and a list can sit at different depths of a consumer's own markup and
 * still agree on what is open and what is being cited.
 */

import { createContext } from "react";
import type { SourceData } from "../../internals/ai-types.js";

/** What the root publishes. Parts read it; only the root writes it. */
export interface SourcesContext {
	/**
	 * Whether the list is expanded. The Svelte side wraps it in a box so a
	 * reactive read tracks the root's prop; the box is kept here because it is
	 * part of the published contract a consumer writes its own parts against —
	 * what makes a part re-render is the root rebuilding this object when the
	 * state changes.
	 */
	readonly open: { readonly current: boolean };
	/** How many sources back the answer. */
	readonly count: number;
	/** The sources themselves, so a list never needs them threaded down as a prop. */
	readonly sources: readonly SourceData[];
	/** The id the list puts on its region, so a trigger can point `aria-controls` at it. */
	readonly listId: string;
	/** Flip the list open or closed. */
	toggle(): void;
}

/**
 * The context a part reads to find the root above it. The Svelte source
 * publishes it under a `Symbol` context key; React's own context object plays
 * that role here, so the exported name is kept and the value is a
 * `React.Context` rather than a symbol:
 *
 * ```tsx
 * const sources = useContext(SOURCES_CONTEXT_KEY);
 * ```
 *
 * Read it as optional. Every shipped part does, so a part rendered outside a
 * root degrades instead of throwing.
 */
export const SOURCES_CONTEXT_KEY = createContext<SourcesContext | undefined>(undefined);
SOURCES_CONTEXT_KEY.displayName = "SourcesContext";
