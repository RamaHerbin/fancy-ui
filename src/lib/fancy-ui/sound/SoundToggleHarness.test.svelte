<!--
  Test-only rig. `bind:` cannot be expressed from a `.ts` test file — the
  props object a test hands to `render` is copied into the component's own
  reactive state, so a write inside the component never lands back on it.
  Binding `ref` here and marking the element is the only way to prove it
  travels back out to the consumer. Not exported from index.ts, and not
  collected by Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import SoundToggle from "./SoundToggle.svelte";

	let el = $state<HTMLButtonElement | null>(null);
	$effect(() => {
		el?.setAttribute("data-bound-ref", "yes");
	});
</script>

<SoundToggle bind:ref={el} />
