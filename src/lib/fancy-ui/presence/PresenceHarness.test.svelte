<!--
  Test-only harness: exposes Presence's bindable `ref` as a plain data
  attribute on a sibling marker node, so `Presence.test.ts` can read the
  bound value's null/non-null-ness through the DOM instead of needing access
  to component internals @testing-library/svelte's `render()` doesn't expose.
  Not exported from index.ts, and not collected by Vitest directly (the run
  includes `*.test.ts` only) — imported from Presence.test.ts.
-->
<script lang="ts">
	import Presence from "./Presence.svelte";
	import type { PresenceProps } from "./Presence.svelte";

	let {
		open,
		...props
	}: { open: boolean } & Partial<Omit<PresenceProps, "children" | "open" | "ref">> = $props();
	let refValue: HTMLDivElement | null = $state(null);
</script>

<div data-testid="ref-probe" data-ref-null={refValue === null ? "true" : "false"}></div>
<Presence bind:ref={refValue} {open} {...props}>
	<p>panel content</p>
</Presence>
