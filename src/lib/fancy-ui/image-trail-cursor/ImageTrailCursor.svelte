<script lang="ts" module>
	import type { VariantType } from "./trail-variants.js";

	export interface ImageTrailCursorProps {
		images?: string[];
		variant?: VariantType;
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { createReducedMotion } from "../_internals/motion/media-query.svelte.js";
	import { variantMap, type ImageTrailVariant } from "./trail-variants.js";

	let { images = [], variant = "type1", class: className = "" }: ImageTrailCursorProps = $props();

	let containerRef = $state<HTMLDivElement>();

	// Tracked live, not just read at mount: flipping the OS setting mid-session
	// starts or stops the trail without remounting the component.
	const reduced = createReducedMotion();
	$effect(() => reduced.start());

	function resetImageStyles(container: HTMLDivElement) {
		const imgEls = container.querySelectorAll<HTMLDivElement>(".content__img");
		for (const el of imgEls) {
			el.style.cssText = "";
			// reveal variants add fragment children; drop any left behind
			for (const frag of el.querySelectorAll(".content__img-frag")) frag.remove();
			const inner = el.querySelector<HTMLDivElement>(".content__img-inner");
			if (inner) {
				// Preserve background-image set by Svelte, only clear GSAP residue
				const bgImage = inner.style.backgroundImage;
				inner.style.cssText = "";
				if (bgImage) inner.style.backgroundImage = bgImage;
			}
		}
	}

	// One variant instance per (variant, motion allowed) pair. Under reduced
	// motion no instance exists at all: no pointer listeners, no rAF loop, no
	// timelines, and the trail images stay hidden. The cleanup destroys the
	// running instance and wipes what it wrote, whether the variant changed,
	// the preference flipped to "reduce", or the component unmounted.
	$effect(() => {
		const container = containerRef;
		const Variant = variantMap[variant] || variantMap.type1;
		if (!container || reduced.current) return;

		resetImageStyles(container);
		let instance: ImageTrailVariant | null = new Variant(container);

		return () => {
			instance?.destroy();
			instance = null;
			resetImageStyles(container);
		};
	});
</script>

<div
	bind:this={containerRef}
	class={cn("relative z-[100] h-full w-full overflow-visible rounded-lg bg-transparent", className)}
	style="touch-action: none;"
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
