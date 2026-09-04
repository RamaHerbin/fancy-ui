<script lang="ts" module>
	/**
	 * Props for LineReveal
	 *
	 * Reveals text line by line with a staggered slide-up animation.
	 * Line breaks are computed with @chenglou/pretext (canvas text
	 * measurement), so no DOM splitting or reflow measurement is needed.
	 */
	export interface LineRevealProps {
		/** Text to reveal */
		text: string;
		/**
		 * CSS font shorthand used for both measurement and rendering
		 * (canvas `ctx.font` format, e.g. "600 32px Inter, sans-serif").
		 * Prefer named families: `system-ui` can resolve differently between
		 * canvas measurement and DOM rendering.
		 */
		font?: string;
		/** Line height in pixels (defaults to 1.2 × font size) */
		lineHeight?: number;
		/** Delay between lines in seconds */
		stagger?: number;
		/** Animation duration per line in seconds */
		duration?: number;
		/** Initial delay before the first line in seconds */
		delay?: number;
		/** Animate only the first time the component enters the viewport */
		once?: boolean;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { onMount } from "svelte";
	import {
		prepareWithSegments,
		layoutWithLines,
		type PreparedTextWithSegments,
	} from "@chenglou/pretext";

	let {
		text,
		// Named families only: canvas and CSS can resolve `system-ui` to
		// different fonts (notably on macOS), which skews measured widths.
		font = '600 32px "Helvetica Neue", Helvetica, Arial, sans-serif',
		lineHeight,
		stagger = 0.08,
		duration = 0.7,
		delay = 0,
		once = true,
		class: className,
	}: LineRevealProps = $props();

	const fontSize = $derived(Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 32));
	const resolvedLineHeight = $derived(lineHeight ?? Math.round(fontSize * 1.2));

	let containerRef: HTMLDivElement;
	let containerWidth = $state(0);
	let revealed = $state(false);
	let prepared = $state<PreparedTextWithSegments | null>(null);

	// Measurement requires a canvas context, so this only runs in the browser
	// ($effect never runs during SSR). Web fonts must be loaded first or the
	// canvas silently measures with the fallback font.
	$effect(() => {
		const currentText = text;
		const currentFont = font;
		let cancelled = false;

		// `document.fonts` (FontFaceSet) may be undefined — jsdom/happy-dom and
		// some older browsers don't implement it — so guard the read instead of
		// letting a missing FontFaceSet throw inside this effect.
		Promise.resolve(document.fonts?.load(currentFont)).catch(() => {}).then(() => {
			if (!cancelled) {
				try {
					prepared = prepareWithSegments(currentText, currentFont);
				} catch {
					// Missing 2d context (e.g. jsdom) — stay on the pre-measure fallback.
				}
			}
		});

		return () => {
			cancelled = true;
		};
	});

	// Pure arithmetic on cached measurements — cheap to re-run on every resize
	// (containerWidth is tracked by Svelte's bind:clientWidth ResizeObserver).
	const layoutResult = $derived(
		prepared && containerWidth > 0
			? layoutWithLines(prepared, containerWidth, resolvedLineHeight)
			: null
	);

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						revealed = true;
						if (once) observer.disconnect();
					} else if (!once) {
						revealed = false;
					}
				}
			},
			{ threshold: 0.1 }
		);

		observer.observe(containerRef);

		return () => observer.disconnect();
	});
</script>

<div
	bind:this={containerRef}
	bind:clientWidth={containerWidth}
	class={cn("relative w-full", className)}
	style:font
	style:line-height="{resolvedLineHeight}px"
	style:height={layoutResult ? `${layoutResult.height}px` : undefined}
>
	<span class="sr-only">{text}</span>
	{#if layoutResult}
		{#each layoutResult.lines as line, i (i)}
			<div class="line-mask" style:height="{resolvedLineHeight}px" aria-hidden="true">
				<div
					class="line"
					class:revealed
					style:transition-duration="{duration}s"
					style:transition-delay="{delay + i * stagger}s"
				>
					{line.text}
				</div>
			</div>
		{/each}
	{:else}
		<!-- SSR / pre-measure fallback: keeps text in the HTML and reserves space -->
		<div style:visibility="hidden" aria-hidden="true">{text}</div>
	{/if}
</div>

<style>
	.line-mask {
		overflow: hidden;
		/* preserve exact spacing so rendered width matches pretext measurement */
		white-space: pre;
	}

	.line {
		opacity: 0;
		transform: translateY(105%);
		transition-property: transform, opacity;
		transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
	}

	.line.revealed {
		opacity: 1;
		transform: translateY(0);
	}

	@media (prefers-reduced-motion: reduce) {
		.line {
			transition-duration: 0.1s !important;
			transition-delay: 0s !important;
		}
	}
</style>
