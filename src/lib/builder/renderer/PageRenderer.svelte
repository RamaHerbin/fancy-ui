<!--
  PageRenderer - Renders a full PageDocument.

  Takes a PageDocument and renders all root-level blocks
  using BlockRenderer recursively.
-->
<script lang="ts">
	import type { PageDocument } from "../types/page.js";
	import BlockRenderer from "./BlockRenderer.svelte";

	interface Props {
		page: PageDocument;
		class?: string;
	}

	let { page, class: className = "" }: Props = $props();
</script>

<div class={className}>
	{#each page.body as node (node.id)}
		<BlockRenderer {node} />
	{/each}
</div>
