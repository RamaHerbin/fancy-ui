/**
 * The contract between a collapsible root and its trigger and content.
 *
 * `Collapsible` owns the open state; `CollapsibleTrigger` and
 * `CollapsibleContent` read it through `getContext` instead of a prop and a
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

export const COLLAPSIBLE_KEY: unique symbol = Symbol("collapsible-context");
