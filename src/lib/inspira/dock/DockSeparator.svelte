<script lang="ts">
	import { getContext } from 'svelte';
	import { cn } from '$lib/utils';
	import { DOCK_CONTEXT_KEY, type DockContext } from './types';

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();

	const context = getContext<DockContext>(DOCK_CONTEXT_KEY);
</script>

<div
	class={cn(
		'relative block bg-secondary',
		context.orientation === 'vertical' ? 'w-4/5 h-0.5' : 'h-4/5 w-0.5',
		className
	)}
></div>
