<!--
  Test-only rig. The keyboard model lives across ToggleGroup and
  ToggleGroupItem together, so proving it needs real instances of both, wired
  up the way a consumer actually would — raw HTML strings from a `.ts` test
  file carry no context and no event handlers. `bind:value` is forwarded
  through this component's own bindable prop so a test can round-trip a
  selection the same way ButtonGroup's harness round-trips a ref. Not
  exported from index.ts, and not collected by Vitest (the run includes
  `*.test.ts` only).
-->
<script lang="ts">
	import ToggleGroup from "./ToggleGroup.svelte";
	import ToggleGroupItem from "./ToggleGroupItem.svelte";

	interface Item {
		value: string;
		label: string;
		disabled?: boolean;
	}

	interface Props {
		items: Item[];
		type?: "single" | "multiple";
		value?: string | string[];
		onValueChange?: (value: string | string[]) => void;
		disabled?: boolean;
		size?: "sm" | "md" | "lg";
		orientation?: "horizontal" | "vertical";
		label?: string;
	}

	let {
		items,
		type = "single",
		value = $bindable(""),
		onValueChange,
		disabled = false,
		size = "md",
		orientation = "horizontal",
		label = "Test group",
	}: Props = $props();
</script>

<ToggleGroup {type} bind:value {onValueChange} {disabled} {size} {orientation} {label}>
	{#snippet children()}
		{#each items as item (item.value)}
			<ToggleGroupItem value={item.value} disabled={item.disabled}>{item.label}</ToggleGroupItem>
		{/each}
	{/snippet}
</ToggleGroup>
