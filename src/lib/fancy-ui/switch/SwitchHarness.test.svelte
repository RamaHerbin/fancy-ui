<!--
  Test-only rig. `bind:` cannot be expressed from a `.ts` test file — the props
  object a test hands to `render` is copied into the component's own reactive
  state, so a write inside the component never lands back on it. Binding here
  and echoing the value into the DOM is the only way to prove `checked`
  travels back out to the consumer rather than merely changing what the
  switch draws, and the same goes for `ref`. Not exported from index.ts, and
  not collected by Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import Switch from "./Switch.svelte";

	interface Props {
		checked?: boolean;
		onCheckedChange?: (checked: boolean) => void;
	}

	let { checked = $bindable(false), onCheckedChange }: Props = $props();

	let el = $state<HTMLInputElement | null>(null);
	$effect(() => {
		el?.setAttribute("data-bound-ref", "yes");
	});
</script>

<Switch bind:checked bind:ref={el} {onCheckedChange} label="Notifications" />

<span data-testid="bound-checked">{checked}</span>
