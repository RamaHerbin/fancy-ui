import Accordion from "./Accordion.svelte";
import AccordionItem from "./AccordionItem.svelte";
import AccordionTrigger from "./AccordionTrigger.svelte";
import AccordionContent from "./AccordionContent.svelte";
import type { AccordionProps } from "./Accordion.svelte";
import type { AccordionItemProps } from "./AccordionItem.svelte";
import type { AccordionTriggerProps } from "./AccordionTrigger.svelte";
import type { AccordionContentProps } from "./AccordionContent.svelte";

export {
	Accordion,
	type AccordionProps,
	AccordionItem,
	type AccordionItemProps,
	AccordionTrigger,
	type AccordionTriggerProps,
	AccordionContent,
	type AccordionContentProps,
};
export type { AccordionOrientation, AccordionType, AccordionValue } from "./accordion-core.js";
export {
	ACCORDION_KEY,
	ACCORDION_ITEM_KEY,
	type AccordionContext,
	type AccordionItemContext,
} from "./types.js";
