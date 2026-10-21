---
"fancy-ui-vue": minor
---

Add Collapsible and Accordion. `Collapsible` (`CollapsibleTrigger`, `CollapsibleContent`) is a single disclosure with `v-model:open`, `onOpenChange` and `disabled`; `Accordion` (`AccordionItem`, `AccordionTrigger`, `AccordionContent`) stacks headed sections with `type="single" | "multiple"`, `v-model:value`, `collapsible`, `orientation`, a configurable heading level, labelled regions and Up/Down/Home/End navigation between headers. The collapse animates `grid-template-rows` from `0fr` to `1fr` without measuring, so an interrupted toggle simply reverses; closed content stays in the page, goes `inert` as soon as it starts closing and `visibility: hidden` once it has finished, and the motion drops to nothing under reduced motion. `:force-mount="false"` unmounts closed content instead. Both forward native attributes to the element they render.
