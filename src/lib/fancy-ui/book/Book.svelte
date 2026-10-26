<script lang="ts">
	import { cn } from "$lib/utils.js";
	import {
		BOOK_RADIUS_MAP as radiusMap,
		BOOK_SIZE_MAP as sizeMap,
		BOOK_COLOR_MAP as colorMap,
		BOOK_SHADOW_SIZE_MAP as shadowSizeMap,
		type BookRadius,
		type BookSize,
		type BookColor,
		type BookShadowSize,
	} from "./index.js";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	interface Own {
		class?: string;
		duration?: number;
		color?: BookColor;
		isStatic?: boolean;
		size?: BookSize;
		radius?: BookRadius;
		shadowSize?: BookShadowSize;
		children?: Snippet;
	}

	type Props = Own & Omit<HTMLAttributes<HTMLDivElement>, keyof Own>;

	let {
		class: className = "",
		duration = 1000,
		color = "zinc",
		isStatic = false,
		size = "md",
		radius = "md",
		shadowSize = "lg",
		children,
		...restProps
	}: Props = $props();

	let computedGradient = $derived(colorMap[color] || colorMap.zinc);
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -- keyboard path for the hover-only open: focus rotates the cover like hover does -->
<div
	tabindex={isStatic ? undefined : 0}
	{...restProps}
	class={cn(
		"group z-10 w-min [--shadowColor:#bbb] [perspective:800px] dark:[--shadowColor:#111]",
		className
	)}
>
	<div
		style="width: {sizeMap[size].width}"
		style:--book-duration="{duration}ms"
		class={cn(
			"book-cover relative aspect-[3/4] [transform-style:preserve-3d]",
			isStatic
				? "[transform:rotateY(-30deg)]"
				: "[transform:rotateY(0deg)] group-hover:[transform:rotateY(-30deg)] group-focus-visible:[transform:rotateY(-30deg)]",
			radiusMap[radius]
		)}
	>
		<!-- Front face -->
		<div
			class="absolute inset-y-0 left-0 flex size-full flex-col justify-end overflow-hidden bg-gradient-to-tr p-6 text-white {computedGradient.from} {computedGradient.to} {radiusMap[
				radius
			]}"
			style="transform: translateZ(25px); box-shadow: 5px 5px 20px var(--shadowColor);"
		>
			<div
				class="absolute top-0 left-0 h-full"
				style="min-width: 8.2%; background: linear-gradient(90deg, hsla(0, 0%, 100%, 0), hsla(0, 0%, 100%, 0) 12%, hsla(0, 0%, 100%, .25) 29.25%, hsla(0, 0%, 100%, 0) 50.5%, hsla(0, 0%, 100%, 0) 75.25%, hsla(0, 0%, 100%, .25) 91%, hsla(0, 0%, 100%, 0)), linear-gradient(90deg, rgba(0, 0, 0, .03), rgba(0, 0, 0, .1) 12%, transparent 30%, rgba(0, 0, 0, .02) 50%, rgba(0, 0, 0, .2) 73.5%, rgba(0, 0, 0, .5) 75.25%, rgba(0, 0, 0, .15) 85.25%, transparent); opacity: 0.2;"
			></div>
			<div class="pl-1">
				{#if children}
					{@render children()}
				{/if}
			</div>
		</div>

		<!-- Spine -->
		<div
			class="absolute left-0 bg-white"
			style="top: 3px; bottom: 3px; width: 48px; transform: translateX({sizeMap[size]
				.spineTranslation}) rotateY(90deg); background: linear-gradient(90deg, rgba(255,255,255,1) 50%, rgba(249,249,249,1) 50%);"
		></div>

		<!-- Back face -->
		<div
			class="absolute inset-y-0 left-0 flex size-full flex-col justify-end overflow-hidden bg-gradient-to-tr p-6 text-white {computedGradient.from} {computedGradient.to} {radiusMap[
				radius
			]}"
			style="transform: translateZ(-25px); box-shadow: {shadowSizeMap[shadowSize]};"
		></div>
	</div>
</div>

<style>
	/* The hover angle is the state; only the tween that turns the cover is motion,
	   so under reduced motion the cover lands on its angle at once. */
	@media (prefers-reduced-motion: no-preference) {
		.book-cover {
			transition: transform var(--book-duration, 1000ms) ease;
		}
	}
</style>
