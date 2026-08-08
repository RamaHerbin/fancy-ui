<!--
  Test-only rig. The keyboard model lives across Tabs, TabsList and
  TabsTrigger together, so proving it needs real instances of all three,
  wired up the way a consumer actually would — raw HTML strings from a `.ts`
  test file carry no context and no event handlers. `bind:value` is
  forwarded through this component's own bindable prop so a test can
  round-trip a selection the same way ToggleGroup's harness does. Not
  exported from index.ts, and not collected by Vitest (the run includes
  `*.test.ts` only).
-->
<script lang="ts">
	import Tabs from "./Tabs.svelte";
	import TabsList from "./TabsList.svelte";
	import TabsTrigger from "./TabsTrigger.svelte";
	import TabsContent from "./TabsContent.svelte";

	interface Item {
		value: string;
		label: string;
		disabled?: boolean;
	}

	interface Props {
		items: Item[];
		value?: string;
		onValueChange?: (value: string) => void;
		orientation?: "horizontal" | "vertical";
		activation?: "automatic" | "manual";
		variant?: "underline" | "segmented";
		forceMount?: boolean;
	}

	let {
		items,
		value = $bindable(""),
		onValueChange,
		orientation = "horizontal",
		activation = "automatic",
		variant = "underline",
		forceMount = false,
	}: Props = $props();
</script>

<Tabs bind:value {onValueChange} {orientation} {activation} {variant}>
	<TabsList>
		{#each items as item (item.value)}
			<TabsTrigger value={item.value} disabled={item.disabled}>{item.label}</TabsTrigger>
		{/each}
	</TabsList>
	{#each items as item (item.value)}
		<TabsContent value={item.value} {forceMount}>Panel {item.label}</TabsContent>
	{/each}
</Tabs>
