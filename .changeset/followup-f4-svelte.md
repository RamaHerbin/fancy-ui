---
"fancy-ui-svelte": patch
---

Docs: `CollapsibleContent` and `AccordionContent` now state in their prop documentation that `forceMount` defaults to `true` and why (stable `aria-controls` targets, server rendering, no measurement). The Collapsible, Accordion, Toggle and ToggleGroup READMEs document closed-content rendering and the form rules: a selected item that is disabled still submits, a disabled group submits nothing.
