<!-- Test-only rig: a group item carrying a consumer attribute bag inside a real group. -->
<script lang="ts">
	import ToggleGroup from "./ToggleGroup.svelte";
	import ToggleGroupItem from "./ToggleGroupItem.svelte";

	interface Props {
		attrs?: Record<string, unknown>;
		disabled?: boolean;
		standalone?: boolean;
	}

	let { attrs = {}, disabled = false, standalone = false }: Props = $props();
</script>

{#if standalone}
	<ToggleGroupItem value="a" {...attrs}>Alpha</ToggleGroupItem>
{:else}
	<ToggleGroup type="single" value="b">
		<ToggleGroupItem value="a" {disabled} {...attrs}>Alpha</ToggleGroupItem>
		<ToggleGroupItem value="b">Beta</ToggleGroupItem>
	</ToggleGroup>
{/if}
