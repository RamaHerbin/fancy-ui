<!--
  Test-only rig, half one of two. The PARENT: it owns the `{#if}`, and the
  element that transitions lives one component down, in
  `ScrollLockPanel.test.svelte`. See that file for what this pair proves.

  `open` is held as local `$state` and flipped from a button inside this
  component, deliberately, rather than driven from the test through
  `rerender()`: `rerender` awaits a tick of its own, so a test using it can
  never observe the ONE flush the proof is about — by the time it returns, the
  stubbed animation has already resolved and the panel has left either way.
  A click flips the state synchronously, so a single `await tick()` after it
  lands exactly inside the exit window.

  Not exported from index.ts, and not collected by Vitest directly (the run
  includes `*.test.ts` only) — imported and rendered from scroll-lock.test.ts.
-->
<script lang="ts">
	import ScrollLockPanel from "./ScrollLockPanel.test.svelte";

	// Always starts closed, so the first click is a genuine (non-first-mount)
	// intro and the second a genuine exit — the pair the proof needs.
	let isOpen = $state(false);
</script>

<button type="button" data-testid="toggle" onclick={() => (isOpen = !isOpen)}>toggle</button>

{#if isOpen}
	<ScrollLockPanel open={isOpen} />
{/if}
