/**
 * The contract between the sources root and its parts.
 *
 * `Sources` publishes a live, read-only view of the citation set it holds, plus
 * the one function that changes anything about it. Every part reads it through
 * `inject` rather than having the same values threaded back down as props, so a
 * trigger and a list can sit at different depths of a consumer's own markup and
 * still agree on what is open and what is being cited.
 */

import type { InjectionKey } from "vue";
import type { SourceData } from "../../internals/ai-types.js";

/** What the root publishes. Parts read it; only the root writes it. */
export interface SourcesContext {
	/** Whether the list is expanded. A getter, so reading it in a reactive scope tracks it. */
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
 * The same symbol the source publishes the context under, now carrying the
 * value type so `provide`/`inject` are checked:
 *
 * ```ts
 * const sources = inject<SourcesContext | undefined>(SOURCES_CONTEXT_KEY, undefined);
 * ```
 *
 * Read it as optional. Every shipped part does, so a part rendered outside a
 * root degrades instead of throwing.
 */
export const SOURCES_CONTEXT_KEY: InjectionKey<SourcesContext> = Symbol("sources-context");
