<!--
  Test-only rig. `bind:` cannot be expressed from a `.ts` test file — the props
  object a test hands to `render` is copied into the component's own reactive
  state, so a write inside the component (the resetAfter timer flipping `state`
  back to "idle") never lands back on it without a real `bind:` in between.
  Binding here and echoing the value into the DOM is the only way to prove the
  two-way contract, matching `SwitchHarness.test.svelte`'s own reasoning.

  Also wraps StatusMorph inside a real <button> with a visible label, mirroring
  the documented Button-composition recipe (`<Button loading={...}
  iconStart={icon}>`) closely enough to test the actual failure mode the portal
  exists for: an un-portalled live region bleeding into the button's own
  accessible name.

  Not exported from index.ts, and not collected by Vitest (the run includes
  `*.test.ts` only).
-->
<script lang="ts">
	import StatusMorph from "./StatusMorph.svelte";
	import type { StatusMorphState, StatusMorphProps } from "./StatusMorph.svelte";

	interface Props extends Omit<StatusMorphProps, "state" | "ref"> {
		state?: StatusMorphState;
	}

	let { state = $bindable("idle"), ...rest }: Props = $props();
</script>

<button>
	<StatusMorph bind:state {...rest} />
	Save changes
</button>
<span data-testid="bound-state">{state}</span>
