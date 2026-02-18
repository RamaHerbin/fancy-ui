<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		padding?: string;
		maxWidth?: string;
		background?: string;
		class?: string;
		children?: Snippet;
	}

	let {
		padding = 'py-16 px-4',
		maxWidth = 'max-w-6xl',
		background = '',
		class: className = '',
		children
	}: Props = $props();
</script>

<section class={cn(padding, background, className)}>
	<div class={cn('mx-auto', maxWidth)}>
		{#if children}
			{@render children()}
		{/if}
	</div>
</section>
