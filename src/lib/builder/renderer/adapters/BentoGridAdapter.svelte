<!--
  Adapter for BentoGrid.
  BentoGrid uses a `children` snippet.
  The builder passes children blocks through.
-->
<script lang="ts">
	import { BentoGrid } from '$lib/fancy-ui/bento-grid/index.js';
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		children?: Snippet;
		[key: string]: unknown;
	}

	let { class: className, children, ...restProps }: Props = $props();
</script>

<BentoGrid class={className} {...restProps}>
	{#if children}
		{@render children()}
	{/if}
</BentoGrid>
