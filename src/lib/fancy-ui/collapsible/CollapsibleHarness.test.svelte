<!--
  Test-only rig: a real Collapsible with its trigger and content, `bind:open`
  forwarded through this component's own bindable prop so a test can round-trip
  the state the way a consumer would. Not exported from index.ts, and not
  collected by Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import Collapsible from "./Collapsible.svelte";
	import CollapsibleTrigger from "./CollapsibleTrigger.svelte";
	import CollapsibleContent from "./CollapsibleContent.svelte";

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		disabled?: boolean;
		forceMount?: boolean;
		rootClass?: string;
		triggerClass?: string;
		contentClass?: string;
		rootRef?: HTMLDivElement | null;
		triggerRef?: HTMLButtonElement | null;
		contentRef?: HTMLDivElement | null;
		rootAttrs?: Record<string, unknown>;
		triggerAttrs?: Record<string, unknown>;
		contentAttrs?: Record<string, unknown>;
	}

	let {
		open = $bindable(false),
		onOpenChange,
		disabled = false,
		forceMount,
		rootClass,
		triggerClass,
		contentClass,
		rootRef = $bindable(null),
		triggerRef = $bindable(null),
		contentRef = $bindable(null),
		rootAttrs = {},
		triggerAttrs = {},
		contentAttrs = {},
	}: Props = $props();
</script>

<Collapsible
	bind:open
	bind:ref={rootRef}
	{onOpenChange}
	{disabled}
	class={rootClass}
	data-testid="root"
	{...rootAttrs}
>
	<CollapsibleTrigger
		bind:ref={triggerRef}
		class={triggerClass}
		data-testid="trigger"
		{...triggerAttrs}
	>
		Toggle
	</CollapsibleTrigger>
	<CollapsibleContent
		bind:ref={contentRef}
		{forceMount}
		class={contentClass}
		data-testid="content"
		{...contentAttrs}
	>
		<button type="button" data-testid="inside">Inside</button>
	</CollapsibleContent>
</Collapsible>
