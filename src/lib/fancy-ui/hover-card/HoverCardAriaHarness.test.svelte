<!--
  Test-only rig for the trigger snippet's `descriptionId` parameter. This has
  to be a real `.svelte` file, not `createRawSnippet` from a `.ts` test: the
  point being proven is that the id HoverCard hands the snippet reaches a
  DOM attribute on the caller's own element, through real Svelte snippet
  parameter passing — `createRawSnippet`'s render function is evaluated once
  and does not reactively re-run when `open` flips, which would make the
  test pass or fail for the wrong reason.

  Not exported from index.ts, and not collected by Vitest (the run includes
  `*.test.ts` only).
-->
<script lang="ts">
	import HoverCard from "./HoverCard.svelte";
</script>

<HoverCard openDelay={300} closeDelay={150}>
	{#snippet trigger(describedBy)}
		<button type="button" data-testid="trigger-button" aria-describedby={describedBy}>
			@handle
		</button>
	{/snippet}
	{#snippet children()}
		<p>Card content</p>
	{/snippet}
</HoverCard>
