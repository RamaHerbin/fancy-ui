<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { class: className = '', children }: Props = $props();
</script>

<div
	class={cn(
		'grid grid-cols-1 gap-4 md:auto-rows-[18rem] md:grid-cols-3 max-w-7xl mx-auto',
		className
	)}
>
	{#if children}
		{@render children()}
	{/if}
</div>
