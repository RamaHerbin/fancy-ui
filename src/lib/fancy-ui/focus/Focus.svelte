<script lang="ts">
	import { cn } from '$lib/utils';
	import { onMount, tick } from 'svelte';

	interface Props {
		sentence?: string;
		manualMode?: boolean;
		blurAmount?: number;
		borderColor?: string;
		animationDuration?: number;
		pauseBetweenAnimations?: number;
		class?: string;
	}

	let {
		sentence = 'Inspira Focus',
		manualMode = false,
		blurAmount = 5,
		borderColor = 'green',
		animationDuration = 0.5,
		pauseBetweenAnimations = 1,
		class: className = ''
	}: Props = $props();

	let words = $derived(sentence.split(' '));
	let containerRef: HTMLDivElement;
	let wordElements: HTMLSpanElement[] = $state([]);
	let currentIndex = $state(0);
	let focusRect = $state({ x: 0, y: 0, width: 0, height: 0 });

	function updateFocusRect() {
		const wordEl = wordElements[currentIndex];
		if (!wordEl || !containerRef) return;
		const parentRect = containerRef.getBoundingClientRect();
		const wordRect = wordEl.getBoundingClientRect();
		focusRect = {
			x: wordRect.left - parentRect.left,
			y: wordRect.top - parentRect.top,
			width: wordRect.width,
			height: wordRect.height
		};
	}

	function handleMouseEnter(index: number) {
		if (manualMode) {
			currentIndex = index;
		}
	}

	function handleMouseLeave() {
		if (manualMode) {
			currentIndex = 0;
		}
	}

	$effect(() => {
		// Track currentIndex to update rect
		currentIndex;
		tick().then(updateFocusRect);
	});

	onMount(() => {
		updateFocusRect();

		if (!manualMode) {
			const intervalMs = animationDuration * 1000 + pauseBetweenAnimations * 1000;
			const id = setInterval(() => {
				currentIndex = (currentIndex + 1) % words.length;
			}, intervalMs);
			return () => clearInterval(id);
		}
	});
</script>

<div bind:this={containerRef} class={cn('focus-container', className)}>
	{#each words as word, index}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<span
			bind:this={wordElements[index]}
			class="focus-word"
			class:manual={manualMode}
			class:active={index === currentIndex && !manualMode}
			style="filter: {index === currentIndex ? 'blur(0px)' : `blur(${blurAmount}px)`}; transition: filter {animationDuration}s ease; --border-color: {borderColor};"
			onmouseenter={() => handleMouseEnter(index)}
			onmouseleave={handleMouseLeave}
		>
			{word}
		</span>
	{/each}

	<div
		class="focus-frame"
		style="transform: translate({focusRect.x}px, {focusRect.y}px); width: {focusRect.width}px; height: {focusRect.height}px; opacity: {currentIndex >= 0 ? 1 : 0}; transition: all {animationDuration}s ease; --border-color: {borderColor};"
	>
		<span class="corner top-left"></span>
		<span class="corner top-right"></span>
		<span class="corner bottom-left"></span>
		<span class="corner bottom-right"></span>
	</div>
</div>

<style>
	.focus-container {
		position: relative;
		display: flex;
		gap: 1em;
		justify-content: center;
		align-items: center;
		flex-wrap: wrap;
	}

	.focus-word {
		position: relative;
		font-size: 3rem;
		font-weight: 900;
		cursor: pointer;
		transition:
			filter 0.3s ease,
			color 0.3s ease;
	}

	.focus-word.active {
		filter: blur(0);
	}

	.focus-frame {
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;
		box-sizing: content-box;
		border: none;
	}

	.corner {
		position: absolute;
		width: 1rem;
		height: 1rem;
		border: 3px solid var(--border-color, #fff);
		filter: drop-shadow(0px 0px 4px var(--border-color, #fff));
		border-radius: 3px;
		transition: none;
	}

	.top-left {
		top: -10px;
		left: -10px;
		border-right: none;
		border-bottom: none;
	}

	.top-right {
		top: -10px;
		right: -10px;
		border-left: none;
		border-bottom: none;
	}

	.bottom-left {
		bottom: -10px;
		left: -10px;
		border-right: none;
		border-top: none;
	}

	.bottom-right {
		bottom: -10px;
		right: -10px;
		border-left: none;
		border-top: none;
	}
</style>
