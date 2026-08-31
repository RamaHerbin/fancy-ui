<!--
  Test-only rig. The status/registration model lives across Stepper and Step
  together, so proving it needs real instances of both, wired up the way a
  consumer actually would — a `.ts` test file has no context and no
  `{#each}`. `bind:current` is forwarded through this component's own
  bindable prop so a test can round-trip the active index, the same way
  ToggleGroupHarness round-trips a selection. Not exported from index.ts,
  and not collected by Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import Stepper from "./Stepper.svelte";
	import Step from "./Step.svelte";

	interface Item {
		label: string;
		description?: string;
	}

	interface Props {
		items: Item[];
		current?: number;
		onCurrentChange?: (current: number) => void;
		orientation?: "horizontal" | "vertical";
		clickable?: boolean;
		onStepClick?: (index: number) => void;
		sound?: boolean;
	}

	let {
		items,
		current = $bindable(0),
		onCurrentChange,
		orientation = "horizontal",
		clickable = false,
		onStepClick,
		sound = false,
	}: Props = $props();

	let el = $state<HTMLOListElement | null>(null);
	$effect(() => {
		el?.setAttribute("data-bound-ref", "yes");
	});
</script>

<Stepper
	bind:current
	bind:ref={el}
	{onCurrentChange}
	{orientation}
	{clickable}
	{onStepClick}
	{sound}
>
	{#each items as item (item.label)}
		<Step label={item.label} description={item.description} />
	{/each}
</Stepper>

<span data-testid="bound-current">{current}</span>
