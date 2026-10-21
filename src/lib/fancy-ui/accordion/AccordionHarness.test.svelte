<!--
  Test-only rig: a real Accordion wired the way a consumer would, with the
  value forwarded through this component's own bindable prop so a test can
  round-trip it. Attribute bags land on the first item's pieces only. Not
  exported from index.ts, and not collected by Vitest (the run includes
  `*.test.ts` only).
-->
<script lang="ts">
	import Accordion from "./Accordion.svelte";
	import AccordionItem from "./AccordionItem.svelte";
	import AccordionTrigger from "./AccordionTrigger.svelte";
	import AccordionContent from "./AccordionContent.svelte";

	interface Item {
		value: string;
		label: string;
		disabled?: boolean;
	}

	interface Props {
		items?: Item[];
		type?: "single" | "multiple";
		value?: string | string[];
		onValueChange?: (value: string | string[]) => void;
		collapsible?: boolean;
		disabled?: boolean;
		orientation?: "horizontal" | "vertical";
		headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
		forceMount?: boolean;
		rootClass?: string;
		rootRef?: HTMLDivElement | null;
		rootAttrs?: Record<string, unknown>;
		itemAttrs?: Record<string, unknown>;
		triggerAttrs?: Record<string, unknown>;
		contentAttrs?: Record<string, unknown>;
	}

	const DEFAULT_ITEMS: Item[] = [
		{ value: "a", label: "Alpha" },
		{ value: "b", label: "Beta" },
		{ value: "c", label: "Gamma" },
	];

	let {
		items = DEFAULT_ITEMS,
		type,
		value = $bindable(),
		onValueChange,
		collapsible,
		disabled,
		orientation,
		headingLevel,
		forceMount,
		rootClass,
		rootRef = $bindable(null),
		rootAttrs = {},
		itemAttrs = {},
		triggerAttrs = {},
		contentAttrs = {},
	}: Props = $props();
</script>

<Accordion
	bind:value
	bind:ref={rootRef}
	{type}
	{onValueChange}
	{collapsible}
	{disabled}
	{orientation}
	class={rootClass}
	data-testid="root"
	{...rootAttrs}
>
	{#each items as item, index (item.value)}
		<AccordionItem
			value={item.value}
			disabled={item.disabled}
			data-testid={`item-${item.value}`}
			{...index === 0 ? itemAttrs : {}}
		>
			<AccordionTrigger
				{headingLevel}
				data-testid={`trigger-${item.value}`}
				{...index === 0 ? triggerAttrs : {}}
			>
				{item.label}
			</AccordionTrigger>
			<AccordionContent
				{forceMount}
				data-testid={`content-${item.value}`}
				{...index === 0 ? contentAttrs : {}}
			>
				<button type="button" data-testid={`inside-${item.value}`}>Panel {item.label}</button>
			</AccordionContent>
		</AccordionItem>
	{/each}
</Accordion>
