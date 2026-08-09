<!--
  Test-only rig. `bind:` cannot be expressed from a `.ts` test file — the
  props object a test hands to `render` is copied into the component's own
  reactive state, so a write inside the component never lands back on it.
  Binding here and echoing the value into the DOM is the only way to prove
  `value` travels back out to the consumer, and the same goes for `ref`. Not
  exported from index.ts, and not collected by Vitest (the run includes
  `*.test.ts` only).
-->
<script lang="ts">
	import Textarea from "./Textarea.svelte";

	interface Props {
		value?: string;
		onValueChange?: (value: string) => void;
	}

	let { value = $bindable(""), onValueChange }: Props = $props();

	let el = $state<HTMLTextAreaElement | null>(null);
	$effect(() => {
		el?.setAttribute("data-bound-ref", "yes");
	});
</script>

<Textarea bind:value bind:ref={el} {onValueChange} label="Message" />

<span data-testid="bound-value">{value}</span>
