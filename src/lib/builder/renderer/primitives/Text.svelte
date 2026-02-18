<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		content?: string;
		tag?: string;
		class?: string;
	}

	let { content = '', tag = 'p', class: className = '' }: Props = $props();
</script>

{#if tag === 'h1'}
	<h1 class={cn(className)}>{content}</h1>
{:else if tag === 'h2'}
	<h2 class={cn(className)}>{content}</h2>
{:else if tag === 'h3'}
	<h3 class={cn(className)}>{content}</h3>
{:else if tag === 'h4'}
	<h4 class={cn(className)}>{content}</h4>
{:else if tag === 'span'}
	<span class={cn(className)}>{content}</span>
{:else}
	<p class={cn(className)}>{content}</p>
{/if}
