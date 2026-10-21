/**
 * The contracts between an accordion root, its items and their triggers.
 *
 * `Accordion` owns which values are open; `AccordionItem` narrows that to its
 * own value and republishes it as a collapsible context (see
 * `../collapsible/types.ts`), so an item's trigger and region are a
 * collapsible's. Arrow-key navigation never reads a registry: the root asks
 * the live DOM for its triggers when a key is pressed, so triggers that mount
 * late or get reordered still step through in the order on screen.
 */

import { createInternalContext, type InternalContext } from "../../internals/dom/context.js";
import type { AccordionOrientation, AccordionType } from "./accordion-core.js";

/** What the root publishes. Items and triggers read it; only the root writes it. */
export interface AccordionContext {
	/** How many items may be open at once. */
	readonly type: AccordionType;
	/** The axis, and so which arrow-key pair moves focus. */
	readonly orientation: AccordionOrientation;
	/** Whether every item is disabled. */
	readonly disabled: boolean;
	/** Whether `value` is open. */
	isOpen(value: string): boolean;
	/** Whether `value` is the open item of a single accordion that may not collapse. */
	isLocked(value: string): boolean;
	/** Toggles `value` and reports the new accordion value. A no-op when nothing would change. */
	toggle(value: string): void;
	/** The id of the trigger for `value`. */
	triggerId(value: string): string;
	/** The id of the region for `value`. */
	contentId(value: string): string;
	/**
	 * Moves focus for a navigation key pressed on `origin`, skipping disabled
	 * triggers and wrapping at both ends. Returns whether the key was handled.
	 */
	navigate(origin: HTMLElement, key: string): boolean;
}

/** What an item publishes to its trigger and region. */
export interface AccordionItemContext {
	/** The item's value. */
	readonly value: string;
	/** Whether this item, or the whole accordion, is disabled. */
	readonly disabled: boolean;
}

export const ACCORDION_KEY: InternalContext<AccordionContext> =
	createInternalContext<AccordionContext>("AccordionContext");

export const ACCORDION_ITEM_KEY: InternalContext<AccordionItemContext> =
	createInternalContext<AccordionItemContext>("AccordionItemContext");
