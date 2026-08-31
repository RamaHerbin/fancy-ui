<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes, HTMLAnchorAttributes } from "svelte/elements";

	type BaseProps = {
		/** Animation speed in seconds */
		speed?: number;
		/** Custom CSS class */
		class?: string;
		/** Render as anchor element */
		href?: string;
		/** Button content */
		children?: Snippet;
		/** Element reference */
		ref?: HTMLButtonElement | HTMLAnchorElement | null;
		/**
		 * Plays the matching interface cue through the sound controller. Off by
		 * default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
	};

	export type RainbowButtonProps = BaseProps &
		Omit<HTMLButtonAttributes, keyof BaseProps> &
		Omit<HTMLAnchorAttributes, keyof BaseProps>;
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";

	let {
		class: className,
		speed = 2,
		href = undefined,
		type = "button",
		disabled,
		ref = $bindable(null),
		children,
		sound = false,
	}: RainbowButtonProps = $props();

	const speedStyle = $derived(`--rainbow-speed: ${speed}s`);

	// No `...restProps` spread exists on this component (see Implementation
	// notes in the README), so there is no consumer `onclick` to forward — the
	// handler only ever plays the cue, and is bound identically on both the
	// anchor and button render branches.
	function handleClick() {
		if (disabled) return;
		if (sound) soundFx.play("press");
	}

	const baseClasses = $derived(
		cn(
			"rainbow-button",
			"group relative inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-[length:200%] px-8 py-2 font-medium transition-colors [background-clip:padding-box,border-box,border-box] [background-origin:border-box] [border:calc(0.08*1rem)_solid_transparent] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
			// Glow effect
			"before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--rainbow-1),var(--rainbow-5),var(--rainbow-3),var(--rainbow-4),var(--rainbow-2))] before:bg-[length:200%] before:[filter:blur(calc(0.8*1rem))]",
			// Light mode: dark button with light text
			"text-white bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--rainbow-1),var(--rainbow-5),var(--rainbow-3),var(--rainbow-4),var(--rainbow-2))]",
			// Dark mode: light button with dark text
			"dark:text-black dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--rainbow-1),var(--rainbow-5),var(--rainbow-3),var(--rainbow-4),var(--rainbow-2))]",
			className
		)
	);
</script>

{#if href}
	<a
		bind:this={ref}
		class={baseClasses}
		style={speedStyle}
		{href}
		aria-disabled={disabled}
		role={disabled ? "link" : undefined}
		tabindex={disabled ? -1 : undefined}
		onclick={handleClick}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		class={baseClasses}
		style={speedStyle}
		{type}
		{disabled}
		onclick={handleClick}
	>
		{@render children?.()}
	</button>
{/if}

<style>
	.rainbow-button {
		--rainbow-1: hsl(0 100% 63%);
		--rainbow-2: hsl(270 100% 63%);
		--rainbow-3: hsl(210 100% 63%);
		--rainbow-4: hsl(195 100% 63%);
		--rainbow-5: hsl(90 100% 63%);
	}

	@keyframes rainbow {
		0% {
			background-position: 0%;
		}
		100% {
			background-position: 200%;
		}
	}

	:global(.animate-rainbow) {
		animation: rainbow var(--rainbow-speed, 2s) infinite linear;
	}

	.rainbow-button::before {
		animation: rainbow var(--rainbow-speed, 2s) infinite linear;
	}
</style>
