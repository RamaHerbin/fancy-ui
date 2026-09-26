<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";

	export interface RippleButtonProps extends Omit<HTMLButtonAttributes, "class"> {
		/** Additional CSS classes */
		class?: string;
		/** Color of the ripple: its glow, its rings and the border tint */
		rippleColor?: string;
		/** Animation duration in milliseconds */
		duration?: number;
		/** Button content */
		children?: Snippet;
		/**
		 * Plays the matching interface cue through the sound controller. Off by
		 * default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
	}

	interface Ripple {
		x: number;
		y: number;
		size: number;
		key: number;
	}

	/**
	 * Where a ripple starts and how big it grows: from the pointer, or from the
	 * centre for a keyboard press (no pointer position), with a diameter that
	 * reaches the farthest corner.
	 */
	export function rippleGeometry(
		rect: { left: number; top: number; width: number; height: number },
		event: { clientX: number; clientY: number; detail: number }
	): { x: number; y: number; size: number } {
		const keyboard = event.detail === 0;
		const cx = keyboard ? rect.width / 2 : event.clientX - rect.left;
		const cy = keyboard ? rect.height / 2 : event.clientY - rect.top;
		const dx = Math.max(cx, rect.width - cx);
		const dy = Math.max(cy, rect.height - cy);
		const size = 2 * Math.hypot(dx, dy);
		return { x: cx - size / 2, y: cy - size / 2, size };
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";

	let {
		class: className,
		rippleColor = "#60a5fa",
		duration = 900,
		children,
		onclick,
		onpointermove,
		sound = false,
		...restProps
	}: RippleButtonProps = $props();

	let buttonRef: HTMLButtonElement;
	let ripples = $state<Ripple[]>([]);
	let nextRippleKey = 0;

	function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		if (sound && !restProps.disabled) soundFx.play("press");
		createRipple(event);
		// Call the original onclick handler if provided
		if (onclick && typeof onclick === "function") {
			onclick(event);
		}
	}

	// The hover glow follows the pointer: two CSS variables, no re-render.
	function handlePointerMove(event: PointerEvent) {
		const el = event.currentTarget as HTMLButtonElement;
		const rect = el.getBoundingClientRect();
		el.style.setProperty("--ripple-x", `${event.clientX - rect.left}px`);
		el.style.setProperty("--ripple-y", `${event.clientY - rect.top}px`);
		onpointermove?.(event as PointerEvent & { currentTarget: EventTarget & HTMLButtonElement });
	}

	function createRipple(event: MouseEvent) {
		if (!buttonRef) return;

		const { x, y, size } = rippleGeometry(buttonRef.getBoundingClientRect(), event);
		const newRipple: Ripple = { x, y, size, key: nextRippleKey++ };
		ripples = [...ripples, newRipple];

		// Remove ripple after animation completes
		setTimeout(() => {
			ripples = ripples.filter((r) => r.key !== newRipple.key);
		}, duration);
	}
</script>

<button
	bind:this={buttonRef}
	class={cn(
		"ripple-button relative isolate flex cursor-pointer items-center justify-center overflow-hidden",
		"bg-background text-foreground border-border rounded-lg border px-5 py-2.5 text-center font-medium",
		"shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_1px_2px_rgb(0_0_0/0.08)]",
		"transition-[transform,border-color,background-color] duration-300 ease-out",
		"hover:bg-muted/40 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
		className
	)}
	style="--ripple-duration: {duration}ms; --ripple-color: {rippleColor}"
	data-rippling={ripples.length > 0 ? "" : undefined}
	onclick={handleClick}
	onpointermove={handlePointerMove}
	{...restProps}
>
	<div class="relative z-10">
		{@render children?.()}
	</div>

	<!-- Hover: a soft glow under the pointer, and a faint ring that keeps pulsing from it -->
	<span class="ripple-hover" aria-hidden="true"></span>

	<span class="pointer-events-none absolute inset-0" aria-hidden="true">
		{#each ripples as ripple (ripple.key)}
			<span
				class="ripple-animation absolute rounded-full"
				style="
					width: {ripple.size}px;
					height: {ripple.size}px;
					top: {ripple.y}px;
					left: {ripple.x}px;
				"
			></span>
		{/each}
	</span>
</button>

<style>
	/* Hover: a fingertip over water. */
	.ripple-hover {
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.3s ease;
		background: radial-gradient(
			80px circle at var(--ripple-x, 50%) var(--ripple-y, 50%),
			color-mix(in srgb, var(--ripple-color) 20%, transparent),
			transparent 70%
		);
	}

	.ripple-hover::after {
		content: "";
		position: absolute;
		left: var(--ripple-x, 50%);
		top: var(--ripple-y, 50%);
		width: 72px;
		height: 72px;
		margin: -36px 0 0 -36px;
		border-radius: 50%;
		border: 1px solid color-mix(in srgb, var(--ripple-color) 55%, transparent);
		opacity: 0;
		transform: scale(0.2);
	}

	.ripple-button:hover .ripple-hover {
		opacity: 1;
	}

	.ripple-button:hover .ripple-hover::after {
		animation: ripple-idle 1.8s cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
	}

	.ripple-button:hover {
		border-color: color-mix(in srgb, var(--ripple-color) 35%, transparent);
	}

	@keyframes ripple-idle {
		0% {
			transform: scale(0.2);
			opacity: 0.9;
		}
		100% {
			transform: scale(1);
			opacity: 0;
		}
	}

	/* The border takes the ripple's tint while a ripple runs. */
	.ripple-button[data-rippling] {
		border-color: color-mix(in srgb, var(--ripple-color) 55%, transparent);
	}

	/* A soft glow that blooms and fades… */
	.ripple-animation {
		background: radial-gradient(
			circle,
			color-mix(in srgb, var(--ripple-color) 40%, transparent) 0%,
			color-mix(in srgb, var(--ripple-color) 16%, transparent) 45%,
			transparent 70%
		);
		animation: ripple-bloom var(--ripple-duration, 900ms) cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
	}

	/* …and two fine rings, the second a beat behind, like a wave on water. */
	.ripple-animation::before,
	.ripple-animation::after {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: 50%;
		border: 2px solid color-mix(in srgb, var(--ripple-color) 90%, transparent);
		transform: scale(0);
		opacity: 0;
		animation: ripple-ring var(--ripple-duration, 900ms) cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
	}

	.ripple-animation::after {
		border-width: 1.5px;
		animation-delay: calc(var(--ripple-duration, 900ms) * 0.12);
	}

	@keyframes ripple-bloom {
		0% {
			transform: scale(0);
			opacity: 1;
		}
		100% {
			transform: scale(1);
			opacity: 0;
		}
	}

	@keyframes ripple-ring {
		0% {
			transform: scale(0);
			opacity: 1;
		}
		60% {
			opacity: 0.8;
		}
		100% {
			transform: scale(1);
			opacity: 0;
		}
	}

	/* Reduced motion: no expansion, just a brief glow where you pressed. */
	@media (prefers-reduced-motion: reduce) {
		.ripple-button:hover .ripple-hover::after {
			animation: none;
		}

		.ripple-animation {
			animation-name: ripple-fade;
		}

		.ripple-animation::before,
		.ripple-animation::after {
			display: none;
		}

		@keyframes ripple-fade {
			0% {
				transform: scale(1);
				opacity: 1;
			}
			100% {
				transform: scale(1);
				opacity: 0;
			}
		}
	}
</style>
