<!--
  Test-only rig. `bind:` cannot be expressed from a `.ts` test file — the props
  object a test hands to `render` is copied into the component's own reactive
  state, so a write inside the component never lands back on it. Binding here
  and echoing the value into the DOM is the only way to prove `pressed` travels
  back out to the consumer rather than merely changing what the button draws,
  and the same goes for `ref`: the harness marks whatever comes out of the
  binding, and finding the mark on the rendered button proves the two are the
  same element. Not exported from index.ts, and not collected by Vitest (the
  run includes `*.test.ts` only).
-->
<script lang="ts">
	import Toggle from "./Toggle.svelte";

	interface Props {
		pressed?: boolean;
		onPressedChange?: (pressed: boolean) => void;
	}

	let { pressed = $bindable(false), onPressedChange }: Props = $props();

	let el = $state<HTMLButtonElement | null>(null);
	$effect(() => {
		el?.setAttribute("data-bound-ref", "yes");
	});
</script>

<Toggle bind:pressed bind:ref={el} {onPressedChange} label="Bold">B</Toggle>

<span data-testid="bound-pressed">{pressed}</span>
