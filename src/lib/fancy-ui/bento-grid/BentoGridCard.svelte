<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		name: string;
		description: string;
		href: string;
		cta: string;
		class?: string;
		icon?: import('svelte').Snippet;
		background?: import('svelte').Snippet;
	}

	let {
		name,
		description: desc,
		href,
		cta,
		class: className = '',
		icon,
		background
	}: Props = $props();
</script>

<div
	class={cn(
		'group relative col-span-3 flex flex-col justify-end overflow-hidden rounded-xl',
		'bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]',
		'transform-gpu dark:bg-black dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]',
		className
	)}
>
	{#if background}
		{@render background()}
	{/if}

	<div
		class="pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-10"
	>
		{#if icon}
			<div
				class="size-12 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75"
			>
				{@render icon()}
			</div>
		{:else}
			<div
				class="size-12 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75"
			></div>
		{/if}
		<h3 class="text-xl font-semibold text-neutral-700 dark:text-neutral-300">
			{name}
		</h3>
		<p class="max-w-lg text-neutral-400">{desc}</p>
	</div>

	<div
		class="pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
	>
		<a
			{href}
			class="pointer-events-auto inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
		>
			{cta} &rarr;
		</a>
	</div>
	<div
		class="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.03] group-hover:dark:bg-neutral-800/10"
	></div>
</div>
