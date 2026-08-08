<!--
  Test-only rig. `bind:` cannot be expressed from a `.ts` test file — the props
  object a test hands to `render` is copied into the component's own reactive
  state, so a write inside the component never lands back on it. Binding here
  and echoing the values into the DOM is the only way to prove `checked`,
  `indeterminate` and `ref` travel back out to the consumer rather than merely
  changing what the box draws. Not exported from index.ts, and not collected
  by Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import Checkbox from "./Checkbox.svelte";

	interface Props {
		checked?: boolean;
		indeterminate?: boolean;
		onCheckedChange?: (checked: boolean) => void;
	}

	let {
		checked = $bindable(false),
		indeterminate = $bindable(false),
		onCheckedChange,
	}: Props = $props();

	let el = $state<HTMLInputElement | null>(null);
	$effect(() => {
		el?.setAttribute("data-bound-ref", "yes");
	});
</script>

<Checkbox bind:checked bind:indeterminate bind:ref={el} {onCheckedChange} label="Agree" />

<span data-testid="bound-checked">{checked}</span>
<span data-testid="bound-indeterminate">{indeterminate}</span>
