<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className = '', children }: Props = $props();
</script>

<h1 class={cn('font-bold select-none mt-3 mb-1 text-balance', className)}>
	{#if children}
		{@render children()}
	{/if}
</h1>
