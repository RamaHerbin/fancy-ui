<!--
  Test-only rig. `bind:` cannot be expressed from a `.ts` test file — the props
  object a test hands to `render` is copied into the component's own reactive
  state, so a write inside the component never lands back on it. Binding here
  and echoing the value into the DOM is the only way to prove `value` and
  `ref` travel back out to the consumer rather than merely changing what the
  trigger draws. Not exported from index.ts, and not collected by Vitest (the
  run includes `*.test.ts` only).
-->
<script lang="ts">
	import DatePicker from "./DatePicker.svelte";
	import { formatISODate } from "../_internals/calendar-core.js";

	interface Props {
		value?: Date | null;
		onValueChange?: (value: Date | null) => void;
	}

	let { value = $bindable(null), onValueChange }: Props = $props();

	let el = $state<HTMLButtonElement | null>(null);
	$effect(() => {
		el?.setAttribute("data-bound-ref", "yes");
	});
</script>

<DatePicker bind:value bind:ref={el} {onValueChange} />

<span data-testid="bound-value">{value ? formatISODate(value) : "none"}</span>
