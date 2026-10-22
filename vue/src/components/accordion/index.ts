import Accordion from "./Accordion.vue";
import AccordionItem from "./AccordionItem.vue";
import AccordionTrigger from "./AccordionTrigger.vue";
import AccordionContent from "./AccordionContent.vue";
import type { AccordionProps } from "./Accordion.vue";
import type { AccordionItemProps } from "./AccordionItem.vue";
import type { AccordionTriggerProps } from "./AccordionTrigger.vue";
import type { AccordionContentProps } from "./AccordionContent.vue";

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
