<script lang="ts">
	import { cn } from "$lib/utils";
	import { onMount } from "svelte";

	interface Props {
		words?: string[];
		interval?: number;
		animationDuration?: number;
		class?: string;
		textClass?: string;
	}

	let {
		words = ["better", "modern", "beautiful", "awesome"],
		interval = 3000,
		animationDuration = 700,
		class: className = "",
		textClass = "",
	}: Props = $props();

	let currentWordIndex = $state(0);
	let currentWord = $derived(words[currentWordIndex] ?? "");
	let letters = $derived(currentWord.split(""));

	onMount(() => {
		const id = setInterval(() => {
			currentWordIndex = (currentWordIndex + 1) % words.length;
		}, interval);

		return () => clearInterval(id);
	});
</script>

<p
	class={cn(
		"relative inline-block rounded-lg px-4 pt-2 pb-3 text-center text-4xl font-bold text-black md:text-7xl dark:text-white",
		"[background:linear-gradient(to_bottom,#f3f4f6,#e5e7eb)]",
		"shadow-[inset_0_-1px_#d1d5db,inset_0_0_0_1px_#d1d5db,_0_4px_8px_#d1d5db]",
		"dark:[background:linear-gradient(to_bottom,#374151,#1f2937)]",
		"dark:shadow-[inset_0_-1px_#10171e,inset_0_0_0_1px_hsla(205,89%,46%,.24),_0_4px_8px_#00000052]",
		className
	)}
>
	<span class={cn("inline-block", textClass)}>
		<span class="inline-block">
			{#key currentWord}
				{#each letters as letter, index}
					<span
						class="text-flip-letter inline-block"
						style="animation-delay: {index * 0.02}s; animation-duration: {animationDuration}ms;"
						>{letter === " " ? "\u00A0" : letter}</span
					>
				{/each}
			{/key}
		</span>
	</span>
</p>

<style>
	:global {
		@keyframes text-flip-in {
			0% {
				opacity: 0;
				filter: blur(10px);
			}
			100% {
				opacity: 1;
				filter: blur(0px);
			}
		}
	}

	.text-flip-letter {
		animation: text-flip-in ease-in-out forwards;
		opacity: 0;
		filter: blur(10px);
	}
</style>
