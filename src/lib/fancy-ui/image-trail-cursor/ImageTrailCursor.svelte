<script lang="ts" module>
	import type { VariantType } from "./trail-variants.js";

	export interface ImageTrailCursorProps {
		images?: string[];
		variant?: VariantType;
		class?: string;
	}
</script>

<script lang="ts">
	import { onMount } from "svelte";
	import { cn } from "$lib/utils.js";
	import { variantMap, type ImageTrailVariant } from "./trail-variants.js";

	let { images = [], variant = "type1", class: className = "" }: ImageTrailCursorProps = $props();

	let containerRef: HTMLDivElement;
	let currentInstance: ImageTrailVariant | null = null;
	let mounted = false;

	function resetImageStyles() {
		if (!containerRef) return;
		const imgEls = containerRef.querySelectorAll<HTMLDivElement>(".content__img");
		for (const el of imgEls) {
			el.style.cssText = "";
			const inner = el.querySelector<HTMLDivElement>(".content__img-inner");
			if (inner) {
				// Preserve background-image set by Svelte, only clear GSAP residue
				const bgImage = inner.style.backgroundImage;
				inner.style.cssText = "";
				if (bgImage) inner.style.backgroundImage = bgImage;
			}
		}
	}

	function initializeVariant() {
		if (!containerRef) return;

		if (currentInstance) {
			currentInstance.destroy();
			currentInstance = null;
		}

		resetImageStyles();

		const Variant = variantMap[variant] || variantMap.type1;
		currentInstance = new Variant(containerRef);
	}

	onMount(() => {
		initializeVariant();
		mounted = true;

		return () => {
			if (currentInstance) {
				currentInstance.destroy();
				currentInstance = null;
			}
		};
	});

	$effect(() => {
		// Track the variant prop
		variant;

		// Skip the first run (onMount handles initial setup)
		if (!mounted) return;

		initializeVariant();
	});
</script>

<div
	bind:this={containerRef}
	class={cn("relative z-[100] h-full w-full overflow-visible rounded-lg bg-transparent", className)}
	style="touch-action: none"
>
	{#each images as image, i (variant + i)}
		<div
			class="content__img absolute top-0 left-0 aspect-[1.1] w-[120px] overflow-hidden rounded-[10px] opacity-0 [will-change:transform,filter] sm:w-[190px] sm:rounded-[15px]"
		>
			<div
				class="content__img-inner absolute top-[-10px] left-[-10px] h-[calc(100%+20px)] w-[calc(100%+20px)] bg-cover bg-center"
				style="background-image: url({image})"
			></div>
		</div>
	{/each}
</div>
