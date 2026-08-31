<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";

	export interface RippleButtonProps extends Omit<HTMLButtonAttributes, "class"> {
		/** Additional CSS classes */
		class?: string;
		/** Color of the ripple effect */
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
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";

	let {
		class: className,
		rippleColor = "#ADD8E6",
		duration = 600,
		children,
		onclick,
		sound = false,
		...restProps
	}: RippleButtonProps = $props();

	let buttonRef: HTMLButtonElement;
	let ripples = $state<Ripple[]>([]);

	function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		if (sound && !restProps.disabled) soundFx.play("press");
		createRipple(event);
		// Call the original onclick handler if provided
		if (onclick && typeof onclick === "function") {
			onclick(event);
		}
	}

	function createRipple(event: MouseEvent) {
		if (!buttonRef) return;

		const rect = buttonRef.getBoundingClientRect();
		const size = Math.max(rect.width, rect.height);
		const x = event.clientX - rect.left - size / 2;
		const y = event.clientY - rect.top - size / 2;

		const newRipple: Ripple = { x, y, size, key: Date.now() };
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
		"relative flex cursor-pointer items-center justify-center overflow-hidden",
		"bg-background text-primary rounded-lg border-2 px-4 py-2 text-center",
		className
	)}
	style="--ripple-duration: {duration}ms"
	onclick={handleClick}
	{...restProps}
>
	<div class="relative z-10">
		{@render children?.()}
	</div>

	<span class="pointer-events-none absolute inset-0">
		{#each ripples as ripple (ripple.key)}
			<span
				class="ripple-animation absolute rounded-full opacity-30"
				style="
					width: {ripple.size}px;
					height: {ripple.size}px;
					top: {ripple.y}px;
					left: {ripple.x}px;
					background-color: {rippleColor};
				"
			></span>
		{/each}
	</span>
</button>

<style>
	@keyframes rippling {
		0% {
			transform: scale(0);
			opacity: 0.3;
		}
		100% {
			transform: scale(2);
			opacity: 0;
		}
	}

	.ripple-animation {
		animation: rippling var(--ripple-duration, 600ms) ease-out forwards;
	}
</style>
