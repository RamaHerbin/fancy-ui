<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		class?: string;
		header?: import('svelte').Snippet;
		icon?: import('svelte').Snippet;
		title?: import('svelte').Snippet;
		description?: import('svelte').Snippet;
	}

	let {
		class: className = '',
		header,
		icon,
		title,
		description
	}: Props = $props();
</script>

<div
	class={cn(
		'row-span-1 rounded-xl group/bento hover:shadow-xl transition duration-200 shadow-input dark:shadow-none p-4 dark:bg-black dark:border-white/[0.2] bg-white border border-transparent justify-between flex flex-col space-y-4',
		className
	)}
>
	{#if header}
		{@render header()}
	{/if}
	<div class="transition duration-200 group-hover/bento:translate-x-2">
		{#if icon}
			{@render icon()}
		{/if}
		{#if title}
			<div class="my-2 font-sans font-bold text-neutral-600 dark:text-neutral-200">
				{@render title()}
			</div>
		{/if}
		{#if description}
			<div class="font-sans text-xs font-normal text-neutral-600 dark:text-neutral-300">
				{@render description()}
			</div>
		{/if}
	</div>
</div>
