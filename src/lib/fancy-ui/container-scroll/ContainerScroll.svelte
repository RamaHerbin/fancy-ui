<script lang="ts">
	import { cn } from "$lib/utils";
	import { onMount } from "svelte";
	import type { Snippet } from "svelte";

	interface Props {
		class?: string;
		titleContent?: Snippet;
		cardContent?: Snippet;
	}

	let { class: className = "", titleContent, cardContent }: Props = $props();

	let containerRef: HTMLDivElement;
	let isMobile = $state(false);
	let scrollYProgress = $state(0);

	let scaleDimensions = $derived(isMobile ? [0.7, 0.9] : [1.05, 1]);
	let rotate = $derived(20 * (1 - scrollYProgress));
	let scale = $derived(
		scaleDimensions[0] + (scaleDimensions[1] - scaleDimensions[0]) * scrollYProgress
	);
	let translateY = $derived(-100 * scrollYProgress);

	function updateIsMobile() {
		isMobile = window.innerWidth <= 768;
	}

	function updateScroll() {
		if (!containerRef) return;
		const rect = containerRef.getBoundingClientRect();
		const windowHeight = window.innerHeight;
		const progress = 1 - Math.max(0, rect.bottom - window.scrollY) / windowHeight;
		scrollYProgress = Math.max(0, Math.min(1, progress));
	}

	onMount(() => {
		updateIsMobile();
		updateScroll();

		window.addEventListener("resize", updateIsMobile);
		window.addEventListener("scroll", updateScroll, { passive: true });
		window.addEventListener("resize", updateScroll, { passive: true });

		return () => {
			window.removeEventListener("resize", updateIsMobile);
			window.removeEventListener("scroll", updateScroll);
			window.removeEventListener("resize", updateScroll);
		};
	});
</script>

<div
	bind:this={containerRef}
	class={cn(
		"relative flex h-[60rem] items-center justify-center p-2 md:h-[80rem] md:p-20",
		className
	)}
>
	<div class="relative w-full py-10 md:py-40" style="perspective: 1000px">
		<!-- Title -->
		<div style="transform: translateY({translateY}px)" class="mx-auto max-w-5xl text-center">
			{#if titleContent}
				{@render titleContent()}
			{/if}
		</div>

		<!-- Card -->
		<div
			style="transform: rotateX({rotate}deg) scale({scale}); box-shadow: 0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003;"
			class="mx-auto -mt-12 h-[30rem] w-full max-w-5xl rounded-[30px] border-4 border-[#6C6C6C] bg-[#222222] p-2 shadow-2xl md:h-[40rem] md:p-6"
		>
			<div
				class="size-full overflow-hidden rounded-2xl bg-gray-100 md:rounded-2xl md:p-4 dark:bg-zinc-900"
			>
				{#if cardContent}
					{@render cardContent()}
				{/if}
			</div>
		</div>
	</div>
</div>
