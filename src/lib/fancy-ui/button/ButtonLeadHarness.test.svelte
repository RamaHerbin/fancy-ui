<!--
  Test-only rig for the lead slot's spinner ↔ `iconStart` cross-fade.

  `loading` is held as local `$state` and flipped from a button inside this
  component, deliberately, rather than driven from the test through
  `rerender()`: `rerender` awaits a tick of its own, so a test using it can
  never observe the ONE flush the cross-fade lives in — by the time it returns,
  the stubbed Web Animations chain (a dummy animation on one microtask, the
  real one on the next) has already resolved and the outgoing node has left
  either way. A raw `.click()` flips the state synchronously, so a single
  `await tick()` after it lands inside the fade window.

  Starts NOT loading on purpose: a local transition never plays on the initial
  render of the block that owns it, so the first click is the first genuine
  swap, and the second click the genuine swap back.

  Not exported from index.ts, and not collected by Vitest directly (the run
  includes `*.test.ts` only) — imported and rendered from Button.test.ts.
-->
<script lang="ts">
	import Button from "./Button.svelte";

	let isLoading = $state(false);
</script>

<button type="button" data-testid="toggle" onclick={() => (isLoading = !isLoading)}>toggle</button>

{#snippet plus()}
	<span class="my-icon-start">+</span>
{/snippet}

<Button loading={isLoading} iconStart={plus}>Save</Button>
