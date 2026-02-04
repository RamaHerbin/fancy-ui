<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type BaseProps = {
		/** Button label text */
		text?: string;
		/** Custom CSS class */
		class?: string;
		/** Button content (overrides text prop) */
		children?: Snippet;
	};

	export type InteractiveHoverButtonProps = BaseProps &
		Omit<HTMLButtonAttributes, keyof BaseProps>;
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';

	let {
		text = 'Button',
		class: className,
		children,
		...restProps
	}: InteractiveHoverButtonProps = $props();
</script>

<button
	class={cn(
		'group relative w-auto cursor-pointer overflow-hidden rounded-full border bg-background p-2 px-6 text-center font-semibold',
		className
	)}
	{...restProps}
>
	<div class="flex items-center gap-2">
		<div
			class="size-2 rounded-lg bg-primary transition-all duration-300 group-hover:scale-[100.8]"
		></div>
		<span
			class="inline-block transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0"
		>
			{#if children}
				{@render children()}
			{:else}
				{text}
			{/if}
		</span>
	</div>

	<div
		class="absolute top-0 z-10 flex size-full translate-x-12 items-center justify-center gap-2 text-primary-foreground opacity-0 transition-all duration-300 group-hover:-translate-x-5 group-hover:opacity-100"
	>
		<span>
			{#if children}
				{@render children()}
			{:else}
				{text}
			{/if}
		</span>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M5 12h14" />
			<path d="m12 5 7 7-7 7" />
		</svg>
	</div>
</button>
