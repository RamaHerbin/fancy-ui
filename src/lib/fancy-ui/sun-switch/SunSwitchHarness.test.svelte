<!--
  Test-only rig. `bind:` cannot be expressed from a `.ts` test file: the props
  object a test hands to `render` is copied into the component's own state, so
  a write inside the component never lands back on it. Binding here and echoing
  the value into the DOM proves `checked` and `ref` travel back out to the
  consumer. Not exported from index.ts, and not collected by Vitest (the run
  includes `*.test.ts` only).
-->
<script lang="ts">
	import SunSwitch from "./SunSwitch.svelte";

	interface Props {
		checked?: boolean;
		onCheckedChange?: (checked: boolean) => void;
	}

	let { checked = $bindable(true), onCheckedChange }: Props = $props();

	let el = $state<HTMLButtonElement | null>(null);
	$effect(() => {
		el?.setAttribute("data-bound-ref", "yes");
	});
</script>

<SunSwitch bind:checked bind:ref={el} {onCheckedChange} label="Theme" />

<span data-testid="bound-checked">{checked}</span>
