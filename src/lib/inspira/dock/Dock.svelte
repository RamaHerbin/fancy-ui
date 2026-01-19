<script lang="ts">
	import { setContext } from 'svelte';
	import { cn } from '$lib/utils';
	import { DOCK_CONTEXT_KEY, type DataOrientation, type Direction, type DockContext } from './types';

	interface Props {
		class?: string;
		magnification?: number;
		distance?: number;
		direction?: Direction;
		orientation?: DataOrientation;
		children?: import('svelte').Snippet;
	}

	let {
		class: className = '',
		magnification = 60,
		distance = 140,
		direction = 'middle',
		orientation = 'horizontal',
		children
	}: Props = $props();

	// Use object with `current` property so children can read reactive updates
	let mouseX = $state({ current: Infinity });
	let mouseY = $state({ current: Infinity });

	const context: DockContext = {
		get mouseX() { return mouseX; },
		get mouseY() { return mouseY; },
		get magnification() { return magnification; },
		get distance() { return distance; },
		get orientation() { return orientation; }
	};

	setContext(DOCK_CONTEXT_KEY, context);

	function onMouseMove(e: MouseEvent) {
		requestAnimationFrame(() => {
			mouseX.current = e.pageX;
			mouseY.current = e.pageY;
		});
	}

	function onMouseLeave() {
		requestAnimationFrame(() => {
			mouseX.current = Infinity;
			mouseY.current = Infinity;
		});
	}

	let directionClass = $derived(
		direction === 'top' ? 'items-start' :
		direction === 'bottom' ? 'items-end' : 'items-center'
	);
</script>

<div
	class={cn(
		'supports-backdrop-blur:bg-white/10 supports-backdrop-blur:dark:bg-black/10 mx-auto flex h-[58px] w-max rounded-2xl border p-2 backdrop-blur-md transition-all gap-4',
		orientation === 'vertical' && 'flex-col w-[58px] h-max',
		directionClass,
		className
	)}
	onmousemove={onMouseMove}
	onmouseleave={onMouseLeave}
	role="toolbar"
	tabindex="0"
>
	{#if children}
		{@render children()}
	{/if}
</div>
