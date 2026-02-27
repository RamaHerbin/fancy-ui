<script lang="ts" module>
	/**
	 * HyperText - Character scramble effect
	 *
	 * Displays text that scrambles through random characters on hover (or on load),
	 * then resolves back to the original text. Each character is individually animated
	 * with a staggered reveal.
	 */
	export interface HyperTextProps {
		/** Text to display and scramble */
		text: string;
		/** Total animation duration in ms */
		duration?: number;
		/** Whether to animate on initial load */
		animateOnLoad?: boolean;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { onMount } from "svelte";

	let { text, duration = 800, animateOnLoad = false, class: className }: HyperTextProps = $props();

	const ALPHABETS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

	let displayChars = $derived(text.split(""));
	let displayText = $state<string[]>([]);
	let intervalId: ReturnType<typeof setInterval> | null = null;
	let iterations = 0;

	// Sync displayText when text prop changes
	$effect(() => {
		displayText = displayChars;
	});

	function getRandomLetter(): string {
		return ALPHABETS[Math.floor(Math.random() * ALPHABETS.length)];
	}

	function startAnimation() {
		stopAnimation();
		iterations = 0;
		const intervalMs = duration / (text.length * 10);

		intervalId = setInterval(() => {
			if (iterations < text.length) {
				displayText = displayText.map((l, i) =>
					l === " " ? l : i <= iterations ? text[i] : getRandomLetter()
				);
				iterations += 0.1;
			} else {
				stopAnimation();
				displayText = text.split("");
			}
		}, intervalMs);
	}

	function stopAnimation() {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}

	function triggerAnimation() {
		iterations = 0;
		startAnimation();
	}

	onMount(() => {
		if (animateOnLoad) {
			triggerAnimation();
		}
		return stopAnimation;
	});
</script>

<div
	class={cn("hyper-text flex scale-100 cursor-default overflow-hidden py-2", className)}
	onmouseenter={triggerAnimation}
	role="presentation"
>
	<div class="flex">
		{#each displayText as letter, i (i)}
			<span
				class={cn("hyper-text-char inline-block font-mono", letter === " " ? "w-3" : "")}
				style="animation:hyperFadeIn 0.3s ease forwards;animation-delay:{i *
					(duration / (text.length * 10))}ms;opacity:0"
			>
				{letter.toUpperCase()}
			</span>
		{/each}
	</div>
</div>

<style>
	:global {
		@keyframes hyperFadeIn {
			0% {
				opacity: 0;
				transform: translateY(-10px);
			}
			100% {
				opacity: 1;
				transform: translateY(0);
			}
		}
	}
</style>
