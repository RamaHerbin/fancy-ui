<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className = '', children }: Props = $props();
</script>

<p class={cn('select-none text-xs/relaxed', className)}>
	{#if children}
		{@render children()}
	{/if}
</p>
