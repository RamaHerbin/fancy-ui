<!--
  Test-only rig. `bind:` cannot be expressed from a `.ts` test file — the props
  object a test hands to `render` is copied into the component's own reactive
  state, so a write inside the component never lands back on it. Binding here
  and echoing the value into the DOM is the only way to prove `open` travels
  back out to the consumer rather than merely changing what HoverCard draws.

  Not exported from index.ts, and not collected by Vitest (the run includes
  `*.test.ts` only).
-->
<script lang="ts">
	import { createRawSnippet } from "svelte";
	import HoverCard from "./HoverCard.svelte";

	let { open = $bindable(false) }: { open?: boolean } = $props();

	const trigger = createRawSnippet(() => ({
		render: () => '<button type="button">@handle</button>',
	}));
	const children = createRawSnippet(() => ({ render: () => "<p>Card content</p>" }));
</script>

<HoverCard bind:open {trigger} {children} openDelay={300} closeDelay={150} />
<span data-testid="bound-open">{open}</span>
