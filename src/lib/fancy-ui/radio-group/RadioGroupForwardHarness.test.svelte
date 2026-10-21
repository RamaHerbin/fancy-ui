<!--
  Test-only rig: a group and items that take arbitrary attribute bags, so the
  forwarding tests can reach a RadioGroupItem inside a RadioGroup. Not exported
  from index.ts, and not collected by Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import RadioGroup from "./RadioGroup.svelte";
	import RadioGroupItem from "./RadioGroupItem.svelte";

	interface Props {
		groupAttrs?: Record<string, unknown>;
		itemAttrs?: Record<string, unknown>;
		onValueChange?: (value: string) => void;
	}

	let { groupAttrs = {}, itemAttrs = {}, onValueChange }: Props = $props();
</script>

<RadioGroup name="pick" label="Pick" {onValueChange} {...groupAttrs}>
	<RadioGroupItem value="a" label="Option A" {...itemAttrs} />
	<RadioGroupItem value="b" label="Option B" />
</RadioGroup>
