import { createContext } from "react";

/**
 * The contract between a collapsible root and its trigger and content.
 *
 * `Collapsible` owns the open state; `CollapsibleTrigger` and
 * `CollapsibleContent` read it through context instead of a prop and a
 * callback threaded down by hand. `AccordionItem` publishes the same context,
 * so an accordion item's trigger and region are a collapsible's, driven by the
 * accordion's value instead of a flag of their own.
 */

/** What a root publishes. The pieces read it; only the root (or an accordion item) writes it. */
export interface CollapsibleContext {
	/** Whether the content is expanded. */
	readonly open: boolean;
	/** Whether the trigger is inert. Does not stop a controlled change from opening it. */
	readonly disabled: boolean;
	/** Flips the open state and reports it. A no-op while disabled. */
	toggle(): void;
	/** The id the trigger renders; the content's `aria-labelledby` target when it is a region. */
	readonly triggerId: string;
	/** The id the content renders; the trigger's `aria-controls` target. */
	readonly contentId: string;
}

/**
 * The context a trigger/content reads to find its surrounding root. The Svelte
 * source publishes it under a `Symbol` context key; React's own context object
 * plays that role here, so the exported name is kept and the value is a
 * `React.Context` rather than a symbol. Read it as optional: a piece rendered
 * outside a root gets `undefined` rather than throwing.
 */
export const COLLAPSIBLE_KEY = createContext<CollapsibleContext | undefined>(undefined);
COLLAPSIBLE_KEY.displayName = "CollapsibleContext";
