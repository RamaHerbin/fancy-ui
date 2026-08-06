<script lang="ts" module>
	/**
	 * Props for ImageGeneration
	 */
	export interface ImageGenerationProps {
		/** Which stage of the generation to render */
		status: "idle" | "generating" | "done" | "error";
		/** The generated image, shown once status is "done" */
		src?: string | null;
		/** Describes the image to assistive tech — typically the prompt */
		alt: string;
		/** CSS aspect-ratio of the frame, holding the layout across every state */
		aspectRatio?: string;
		/** Muted caption line under the frame */
		prompt?: string;
		/** The failure line shown in the error state */
		errorText?: string;
		/** Pressing retry calls this; the retry button only exists when it is set */
		onRetry?: () => void;
		/** Called once the generated image has finished loading */
		onLoad?: () => void;
		/** Additional CSS classes */
		class?: string;
		/** Element reference */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { onMount } from "svelte";
	import { cn } from "$lib/utils.js";
	import PixelLoader from "../pixel-loader/PixelLoader.svelte";

	let {
		status,
		src,
		alt,
		aspectRatio = "1 / 1",
		prompt,
		errorText = "Generation failed",
		onRetry,
		onLoad,
		class: className,
		ref = $bindable(null),
	}: ImageGenerationProps = $props();

	let imageEl: HTMLImageElement | null = $state(null);

	/*
	 * The reveal is opt-in rather than opt-out: `mounted` is false through the
	 * whole server render, so the markup that leaves the server carries no blur
	 * class and a page that never hydrates — or hydrates with JavaScript
	 * disabled — shows a sharp image instead of a permanently smeared one.
	 * Turning it on in `onMount` is early enough to still catch the load event,
	 * which the browser queues as a separate task at the earliest.
	 */
	let mounted = $state(false);

	/*
	 * Which URL finished loading, rather than a boolean: a second generation
	 * swaps `src` while the same <img> stays mounted, and comparing the two
	 * re-arms the reveal for the new image without an effect to reset a flag.
	 */
	let loadedSrc: string | null = $state(null);

	const blurred = $derived(mounted && loadedSrc !== src);

	function handleLoad() {
		// A cached image can be complete before `onMount` runs and fire its load
		// event after; both paths land here, and only the first one counts.
		if (loadedSrc === src) return;
		loadedSrc = src ?? null;
		onLoad?.();
	}

	function handleError() {
		// A broken image would otherwise sit blurred forever waiting for a load
		// that is never coming. Reveal it — the browser's own broken-image mark
		// is the honest thing to show — without claiming it loaded.
		loadedSrc = src ?? null;
	}

	onMount(() => {
		// An image that is already `complete` here has settled its fate before this
		// code existed — hydration over server markup, a cache hit, or a failure —
		// and neither `load` nor `error` is coming to settle it later. So being
		// complete at mount is decisive on its own: the reveal is never armed over
		// one, whichever way it went.
		if (imageEl?.complete) {
			if (imageEl.naturalWidth > 0) {
				// Decoded and on screen: blurring it back out would be a regression the
				// reader can see, and the caller still deserves the arrival it missed.
				handleLoad();
			} else {
				// No intrinsic width — a broken image, or an SVG sized only by its
				// viewBox. Reveal it without claiming a load that may never have
				// happened; the browser's own broken-image mark is the honest thing to
				// show, and an SVG that renders fine has nothing to hide behind.
				loadedSrc = src ?? null;
			}
		}
		mounted = true;
	});
</script>

<div
	bind:this={ref}
	class={cn("ft-imagegen flex w-full flex-col gap-2", className)}
	aria-busy={status === "generating" ? "true" : undefined}
>
	<div
		class={cn(
			"ft-imagegen-frame relative w-full overflow-hidden rounded-lg border",
			status === "idle" && "ft-imagegen-frame-idle"
		)}
		style="aspect-ratio: {aspectRatio}"
	>
		{#if status === "generating"}
			<div class="ft-imagegen-dots" aria-hidden="true"></div>
			<div class="absolute inset-0 flex items-center justify-center">
				<PixelLoader cols={8} rows={8} />
			</div>
		{:else if status === "done" && src}
			<img
				bind:this={imageEl}
				{src}
				{alt}
				class={cn(
					"ft-imagegen-img absolute inset-0 h-full w-full object-cover",
					blurred && "ft-imagegen-img-blurred"
				)}
				onload={handleLoad}
				onerror={handleError}
			/>
		{:else if status === "error"}
			<div
				class="ft-imagegen-error absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center"
				role="alert"
			>
				<span class="ft-imagegen-error-icon" aria-hidden="true">
					<svg
						class="size-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path
							d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
						/>
						<path d="M12 9v4" />
						<path d="M12 17h.01" />
					</svg>
				</span>
				<p class="ft-imagegen-error-text text-sm">{errorText}</p>
				{#if onRetry}
					<button
						type="button"
						class="ft-imagegen-retry rounded border px-2.5 py-1 text-xs font-medium transition-colors"
						onclick={onRetry}
					>
						Retry
					</button>
				{/if}
			</div>
		{/if}
	</div>

	{#if prompt}
		<p class="ft-imagegen-prompt text-muted-foreground text-xs leading-relaxed">{prompt}</p>
	{/if}
</div>

<style>
	/*
	 * The neutral chrome mixes `currentColor` into transparency rather than
	 * naming a colour, so the frame sits at the same distance from whatever
	 * surface it lands on in either scheme, with no light-dark() pair to keep
	 * balanced. Only the error state names a colour, and it names the family
	 * token so every failure surface moves together.
	 */
	.ft-imagegen-frame {
		background: var(--ft-imagegen-bg, color-mix(in oklab, currentColor 4%, transparent));
		border-color: var(--ft-imagegen-border, color-mix(in oklab, currentColor 12%, transparent));
	}

	.ft-imagegen-frame-idle {
		border-style: dashed;
	}

	/*
	 * Inset by two tiles so the layer overhangs the frame on every side: the
	 * drift translates a whole tile, and the overhang is what keeps the edges
	 * covered while it does. `overflow-hidden` on the frame clips the surplus.
	 */
	.ft-imagegen-dots {
		position: absolute;
		inset: calc(var(--ft-imagegen-dot-size, 12px) * -2);
		background-image: radial-gradient(
			circle at center,
			var(--ft-imagegen-dot, color-mix(in oklab, currentColor 20%, transparent)) 1px,
			transparent 1.5px
		);
		background-size: var(--ft-imagegen-dot-size, 12px) var(--ft-imagegen-dot-size, 12px);
	}

	.ft-imagegen-error-icon,
	.ft-imagegen-error-text {
		color: var(
			--ft-imagegen-error-fg,
			var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
		);
	}

	.ft-imagegen-retry {
		color: var(
			--ft-imagegen-error-fg,
			var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
		);
		border-color: color-mix(in oklab, currentColor 30%, transparent);
	}

	.ft-imagegen-retry:hover {
		background: color-mix(in oklab, currentColor 10%, transparent);
	}

	/*
	 * Both halves of the reveal — the blurred starting point and the transition
	 * out of it — live behind `no-preference`. With those rules gone there is
	 * nothing to override and nothing to keep in sync: the image is simply
	 * sharp the moment it arrives, which is also what a server render ships.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-imagegen-img {
			transition:
				filter var(--ft-imagegen-reveal, 700ms) ease-out,
				transform var(--ft-imagegen-reveal, 700ms) ease-out;
		}

		.ft-imagegen-img-blurred {
			filter: blur(var(--ft-imagegen-blur, 24px));
			/* The overscale hides the transparent fringe a blur pulls in from
			   outside the image's own edges. */
			transform: scale(1.05);
		}

		.ft-imagegen-dots {
			animation: ft-imagegen-drift var(--ft-imagegen-drift, 14s) linear infinite;
		}

		@keyframes ft-imagegen-drift {
			from {
				transform: translate3d(0, 0, 0);
			}
			to {
				transform: translate3d(
					var(--ft-imagegen-dot-size, 12px),
					var(--ft-imagegen-dot-size, 12px),
					0
				);
			}
		}
	}
</style>
