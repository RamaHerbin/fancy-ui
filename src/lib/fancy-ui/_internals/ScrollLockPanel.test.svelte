<!--
  Test-only rig, half two of two. The CHILD component: its root element
  carries the exit transition and `use:scrollLock`, exactly as a real panel
  does, while the `{#if}` that mounts and unmounts it lives in its PARENT
  (`ScrollLockHarness.test.svelte`).

  That split is the whole point. Five Tier-2 panels are shaped this way, and
  the campaign's design rests on a claim about Svelte's internals: a LOCAL
  transition on a child component's root element is still collected by the
  parent's `{#if}` when that branch closes, because the child compiles to a
  transparent effect the collector walks through. If the claim is wrong the
  transition is skipped, the branch is destroyed synchronously, and the scroll
  lock releases the instant `open` flips rather than when the surface is
  actually gone. `scroll-lock.test.ts` proves it rather than assuming it.

  Not exported from index.ts, and not collected by Vitest directly (the run
  includes `*.test.ts` only) — imported and rendered from scroll-lock.test.ts.
-->
<script lang="ts">
	import { scrollLock } from "./scroll-lock.js";
	import { anchored } from "./motion/anchored.js";
	import { DURATIONS } from "./motion/tokens.js";

	interface Props {
		/** The parent's own `{#if}` condition, forwarded so the one
		 * bidirectional directive can tell an entrance from an exit. */
		open: boolean;
	}

	let { open }: Props = $props();
</script>

<div
	data-testid="panel"
	use:scrollLock
	transition:anchored={{
		entering: open,
		duration: DURATIONS.base,
		exitDuration: DURATIONS.exit,
	}}
>
	panel
</div>
