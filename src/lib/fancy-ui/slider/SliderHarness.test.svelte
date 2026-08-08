<!--
  Test-only rig. `bind:` cannot be expressed from a `.ts` test file — the props
  object a test hands to `render` is copied into the component's own reactive
  state, so a write inside the component never lands back on it. Binding here
  and echoing the value into the DOM is the only way to prove `value` travels
  back out to the consumer rather than merely changing what the input draws,
  and the same goes for `ref`. Not exported from index.ts, and not collected
  by Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import Slider from "./Slider.svelte";

	interface Props {
		value?: number;
		onValueChange?: (value: number) => void;
	}

	let { value = $bindable(0), onValueChange }: Props = $props();

	let el = $state<HTMLInputElement | null>(null);
	$effect(() => {
		el?.setAttribute("data-bound-ref", "yes");
	});
</script>

<Slider bind:value bind:ref={el} {onValueChange} label="Volume" />

<span data-testid="bound-value">{value}</span>
