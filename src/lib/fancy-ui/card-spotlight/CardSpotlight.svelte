<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		class?: string;
		slotClass?: string;
		gradientSize?: number;
		gradientColor?: string;
		gradientOpacity?: number;
		children?: import('svelte').Snippet;
	}

	let {
		class: className = '',
		slotClass = '',
		gradientSize = 200,
		gradientColor = '#262626',
		gradientOpacity = 0.8,
		children
	}: Props = $props();

	let mouseX = $state(-gradientSize * 10);
	let mouseY = $state(-gradientSize * 10);

	function handleMouseMove(e: MouseEvent) {
		const target = e.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		mouseX = e.clientX - rect.left;
		mouseY = e.clientY - rect.top;
	}

	function handleMouseLeave() {
		mouseX = -gradientSize * 10;
		mouseY = -gradientSize * 10;
	}

	let backgroundStyle = $derived(
		`radial-gradient(circle at ${mouseX}px ${mouseY}px, ${gradientColor} 0%, rgba(0, 0, 0, 0) 70%)`
	);
</script>

<div
	class={cn(
		'group relative flex size-full overflow-hidden rounded-xl border bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white',
		className
	)}
	onmousemove={handleMouseMove}
	onmouseleave={handleMouseLeave}
>
	<div class={cn('relative z-10', slotClass)}>
		{#if children}
			{@render children()}
		{/if}
	</div>
	<div
		class="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
		style="background: {backgroundStyle}; opacity: {gradientOpacity}"
	></div>
</div>
