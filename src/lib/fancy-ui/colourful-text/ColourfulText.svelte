<script lang="ts" module>
	/**
	 * ColourfulText - Per-character color animation
	 *
	 * Each character is individually animated with shuffled colors.
	 * Colors reshuffle every 5 seconds with staggered CSS transitions.
	 * Pure CSS implementation (no motion library dependency).
	 */
	export interface ColourfulTextProps {
		/** Text to animate */
		text: string;
		/** Array of colors to cycle through */
		colors?: string[];
		/** Initial color before animation */
		startColor?: string;
		/** Transition duration in seconds for each character */
		duration?: number;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { onMount } from 'svelte';

	let {
		text,
		colors = [
			'rgb(131, 179, 32)',
			'rgb(47, 195, 106)',
			'rgb(42, 169, 210)',
			'rgb(4, 112, 202)',
			'rgb(107, 10, 255)',
			'rgb(183, 0, 218)',
			'rgb(218, 0, 171)',
			'rgb(230, 64, 92)',
			'rgb(232, 98, 63)',
			'rgb(249, 129, 47)'
		],
		startColor = 'rgb(255, 255, 255)',
		duration = 0.5,
		class: className
	}: ColourfulTextProps = $props();

	let currentColors = $state<string[]>([]);

	function shuffleColors() {
		currentColors = [...colors].sort(() => 0.5 - Math.random());
	}

	// Initialize with shuffled colors
	shuffleColors();

	onMount(() => {
		const intervalId = setInterval(() => {
			if (document.visibilityState === 'visible') {
				shuffleColors();
			}
		}, 5000);

		return () => clearInterval(intervalId);
	});

	const chars = $derived(text.split(''));
</script>

<span class={cn('colourful-text inline-flex', className)}>
	{#each chars as char, i (i)}
		<span
			class="colourful-char inline-block"
			style="color:{currentColors[i % currentColors.length] ?? startColor};transition:color {duration}s ease {i * 0.05}s,opacity {duration}s ease {i * 0.05}s,transform {duration}s ease {i * 0.05}s,filter {duration}s ease {i * 0.05}s"
		>{char === ' ' ? '\u00A0' : char}</span>
	{/each}
</span>
