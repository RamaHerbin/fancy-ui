<!--
  Test-only rig. `bind:` cannot be expressed from a `.ts` test file — the props
  object a test hands to `render` is copied into the component's own reactive
  state, so a write inside the component never lands back on it. Binding here
  and echoing the value into the DOM is the only way to prove `open` travels
  back out to the consumer (and that a consumer's own bound variable can, in
  turn, open the sheet) rather than merely changing what the sheet draws
  internally. Not exported from index.ts, and not collected by Vitest (the
  run includes `*.test.ts` only).
-->
<script lang="ts">
	import Sheet from "./Sheet.svelte";

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}

	let { open = $bindable(false), onOpenChange }: Props = $props();

	let panelRef = $state<HTMLDivElement | null>(null);
	$effect(() => {
		panelRef?.setAttribute("data-bound-ref", "yes");
	});
</script>

<button type="button" data-testid="trigger" onclick={() => (open = true)}>Open</button>

<Sheet bind:open bind:ref={panelRef} {onOpenChange} title="Settings">Body content</Sheet>

<span data-testid="bound-open">{open}</span>
