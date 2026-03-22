<script lang="ts" module>
	import type { Snippet } from "svelte";

	/**
	 * Line Hover Link Variants
	 *
	 * slide    - Line slides in from right to left
	 * double   - Two lines animate with different timings
	 * grow     - Line grows thicker on hover
	 * strike   - Strikethrough effect with text scale
	 * fade     - Lines fade up with stagger delay
	 * pulse    - Line pulses up and down
	 * swap     - Two lines go opposite directions
	 * sweep    - Full background cover sweep
	 * bounce   - Bouncy squish animation
	 * arc      - SVG arc stroke draws in
	 * scribble - SVG scribble stroke draws in
	 */
	export type LineHoverVariant =
		| "slide"
		| "double"
		| "grow"
		| "strike"
		| "fade"
		| "pulse"
		| "swap"
		| "sweep"
		| "bounce"
		| "arc"
		| "scribble";

	export interface LineHoverLinkProps {
		/** The animation variant */
		variant?: LineHoverVariant;
		/** Link href */
		href?: string;
		/** Link target */
		target?: string;
		/** Link rel */
		rel?: string;
		/** Accessible label */
		"aria-label"?: string;
		/** Additional CSS classes */
		class?: string;
		children?: Snippet;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		variant = "slide",
		href = "#",
		target,
		rel,
		"aria-label": ariaLabel,
		class: className = "",
		children,
	}: LineHoverLinkProps = $props();

	const needsSpan = $derived(["strike", "bounce", "arc", "scribble"].includes(variant));
	const relValue = $derived(target === "_blank" ? (rel ?? "noopener noreferrer") : rel);
</script>

<a
	{href}
	{target}
	aria-label={ariaLabel}
	rel={relValue}
	class={cn("link-hover", `link-hover--${variant}`, className)}
>
	{#if needsSpan}
		<span
			>{#if children}{@render children()}{/if}</span
		>
	{:else if children}
		{@render children()}
	{/if}

	{#if variant === "arc"}
		<svg
			class="link-hover__graphic link-hover__graphic--stroke link-hover__graphic--arc"
			width="100%"
			height="18"
			viewBox="0 0 59 18"
			aria-hidden="true"
		>
			<path d="M.945.149C12.3 16.142 43.573 22.572 58.785 10.842" pathLength="1" />
		</svg>
	{:else if variant === "scribble"}
		<svg
			class="link-hover__graphic link-hover__graphic--stroke link-hover__graphic--scribble"
			width="100%"
			height="9"
			viewBox="0 0 101 9"
			aria-hidden="true"
		>
			<path
				d="M.426 1.973C4.144 1.567 17.77-.514 21.443 1.48 24.296 3.026 24.844 4.627 27.5 7c3.075 2.748 6.642-4.141 10.066-4.688 7.517-1.2 13.237 5.425 17.59 2.745C58.5 3 60.464-1.786 66 2c1.996 1.365 3.174 3.737 5.286 4.41 5.423 1.727 25.34-7.981 29.14-1.294"
				pathLength="1"
			/>
		</svg>
	{/if}
</a>

<style>
	.link-hover {
		cursor: pointer;
		position: relative;
		white-space: nowrap;
		color: currentColor;
		text-decoration: none;
	}

	.link-hover::before,
	.link-hover::after {
		position: absolute;
		width: 100%;
		height: 1px;
		background: currentColor;
		top: 100%;
		left: 0;
		pointer-events: none;
	}

	.link-hover::before {
		content: "";
	}

	/* Slide */
	.link-hover--slide::before {
		transform-origin: 100% 50%;
		transform: scale3d(0, 1, 1);
		transition: transform 0.3s;
	}

	.link-hover--slide:is(:hover, :focus-visible)::before {
		transform-origin: 0% 50%;
		transform: scale3d(1, 1, 1);
	}

	/* Double */
	.link-hover--double::before {
		transform-origin: 100% 50%;
		transform: scale3d(0, 1, 1);
		transition: transform 0.3s cubic-bezier(0.7, 0, 0.2, 1);
	}

	.link-hover--double:is(:hover, :focus-visible)::before {
		transform-origin: 0% 50%;
		transform: scale3d(1, 1, 1);
		transition-timing-function: cubic-bezier(0.4, 1, 0.8, 1);
	}

	.link-hover--double::after {
		content: "";
		top: calc(100% + 4px);
		transform-origin: 0% 50%;
		transform: scale3d(0, 1, 1);
		transition: transform 0.3s cubic-bezier(0.7, 0, 0.2, 1);
	}

	.link-hover--double:is(:hover, :focus-visible)::after {
		transform-origin: 100% 50%;
		transform: scale3d(1, 1, 1);
		transition-timing-function: cubic-bezier(0.4, 1, 0.8, 1);
	}

	/* Grow */
	.link-hover--grow::before {
		transform-origin: 100% 50%;
		transform: scale3d(0, 1, 1);
		transition: transform 0.3s cubic-bezier(0.2, 1, 0.8, 1);
	}

	.link-hover--grow:is(:hover, :focus-visible)::before {
		transform-origin: 0% 50%;
		transform: scale3d(1, 2, 1);
		transition-timing-function: cubic-bezier(0.7, 0, 0.2, 1);
	}

	.link-hover--grow::after {
		content: "";
		top: calc(100% + 4px);
		transform-origin: 100% 50%;
		transform: scale3d(0, 1, 1);
		transition: transform 0.4s 0.1s cubic-bezier(0.2, 1, 0.8, 1);
	}

	.link-hover--grow:is(:hover, :focus-visible)::after {
		transform-origin: 0% 50%;
		transform: scale3d(1, 1, 1);
		transition-timing-function: cubic-bezier(0.7, 0, 0.2, 1);
	}

	/* Strike */
	.link-hover--strike {
		padding: 0 10px;
	}

	.link-hover--strike::before {
		top: 50%;
		height: 2px;
		transform-origin: 100% 50%;
		transform: scale3d(0, 1, 1);
		transition: transform 0.3s cubic-bezier(0.4, 1, 0.8, 1);
	}

	.link-hover--strike:is(:hover, :focus-visible)::before {
		transform-origin: 0% 50%;
		transform: scale3d(1, 1, 1);
	}

	.link-hover--strike span {
		display: inline-block;
		transition: transform 0.3s cubic-bezier(0.4, 1, 0.8, 1);
	}

	.link-hover--strike:is(:hover, :focus-visible) span {
		transform: scale3d(1.1, 1.1, 1.1);
	}

	/* Fade */
	.link-hover--fade::before,
	.link-hover--fade::after {
		opacity: 0;
		transform-origin: 50% 0%;
		transform: translate3d(0, 3px, 0);
		transition-property: transform, opacity;
		transition-duration: 0.3s;
		transition-timing-function: cubic-bezier(0.2, 1, 0.8, 1);
	}

	.link-hover--fade:is(:hover, :focus-visible)::before,
	.link-hover--fade:is(:hover, :focus-visible)::after {
		opacity: 1;
		transform: translate3d(0, 0, 0);
		transition-timing-function: cubic-bezier(0.2, 0, 0.3, 1);
	}

	.link-hover--fade::after {
		content: "";
		top: calc(100% + 4px);
		width: 70%;
		left: 15%;
	}

	.link-hover--fade::before,
	.link-hover--fade:is(:hover, :focus-visible)::after {
		transition-delay: 0.1s;
	}

	.link-hover--fade:is(:hover, :focus-visible)::before {
		transition-delay: 0s;
	}

	/* Pulse */
	.link-hover--pulse::before {
		height: 10px;
		top: 100%;
		opacity: 0;
	}

	.link-hover--pulse:is(:hover, :focus-visible)::before {
		opacity: 1;
		animation: lineUp 0.3s ease forwards;
	}

	@keyframes lineUp {
		0% {
			transform-origin: 50% 100%;
			transform: scale3d(1, 0.045, 1);
		}
		50% {
			transform-origin: 50% 100%;
			transform: scale3d(1, 1, 1);
		}
		51% {
			transform-origin: 50% 0%;
			transform: scale3d(1, 1, 1);
		}
		100% {
			transform-origin: 50% 0%;
			transform: scale3d(1, 0.045, 1);
		}
	}

	.link-hover--pulse::after {
		content: "";
		transition: opacity 0.3s;
		opacity: 0;
		transition-delay: 0s;
	}

	.link-hover--pulse:is(:hover, :focus-visible)::after {
		opacity: 1;
		transition-delay: 0.3s;
	}

	/* Swap */
	.link-hover--swap::before {
		transform-origin: 0% 50%;
		transform: scale3d(0, 1, 1);
		transition: transform 0.3s;
	}

	.link-hover--swap:is(:hover, :focus-visible)::before {
		transform: scale3d(1, 1, 1);
	}

	.link-hover--swap::after {
		content: "";
		top: calc(100% + 4px);
		transition: transform 0.3s;
		transform-origin: 100% 50%;
	}

	.link-hover--swap:is(:hover, :focus-visible)::after {
		transform: scale3d(0, 1, 1);
	}

	/* Sweep */
	.link-hover--sweep::before {
		height: 100%;
		top: 0;
		opacity: 0;
	}

	.link-hover--sweep:is(:hover, :focus-visible)::before {
		opacity: 1;
		animation: coverUp 0.3s ease forwards;
	}

	@keyframes coverUp {
		0% {
			transform-origin: 50% 100%;
			transform: scale3d(1, 0.045, 1);
		}
		50% {
			transform-origin: 50% 100%;
			transform: scale3d(1, 1, 1);
		}
		51% {
			transform-origin: 50% 0%;
			transform: scale3d(1, 1, 1);
		}
		100% {
			transform-origin: 50% 0%;
			transform: scale3d(1, 0.045, 1);
		}
	}

	.link-hover--sweep::after {
		content: "";
		transition: opacity 0.3s;
	}

	.link-hover--sweep:is(:hover, :focus-visible)::after {
		opacity: 0;
	}

	/* Bounce */
	.link-hover--bounce::before {
		height: 7px;
		border-radius: 20px;
		transform: scale3d(1, 1, 1);
		transition:
			transform 0.2s,
			opacity 0.2s;
		transition-timing-function: cubic-bezier(0.2, 0.57, 0.67, 1.53);
	}

	.link-hover--bounce:is(:hover, :focus-visible)::before {
		transition-timing-function: cubic-bezier(0.8, 0, 0.1, 1);
		transition-duration: 0.4s;
		opacity: 1;
		transform: scale3d(1.2, 0.1, 1);
	}

	.link-hover--bounce span {
		transform: translate3d(0, -4px, 0);
		display: inline-block;
		transition: transform 0.2s 0.05s cubic-bezier(0.2, 0.57, 0.67, 1.53);
	}

	.link-hover--bounce:is(:hover, :focus-visible) span {
		transform: translate3d(0, 0, 0);
		transition-timing-function: cubic-bezier(0.8, 0, 0.1, 1);
		transition-duration: 0.4s;
		transition-delay: 0s;
	}

	/* SVG Graphics Base */
	.link-hover__graphic {
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;
		fill: none;
		stroke: currentColor;
		stroke-width: 1px;
	}

	.link-hover__graphic--stroke :global(path) {
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
	}

	.link-hover:is(:hover, :focus-visible) .link-hover__graphic--stroke :global(path) {
		stroke-dashoffset: 0;
	}

	/* Arc */
	.link-hover--arc::before {
		display: none;
	}

	.link-hover__graphic--arc {
		top: 73%;
		left: -23%;
	}

	.link-hover__graphic--arc :global(path) {
		transition: stroke-dashoffset 0.4s cubic-bezier(0.7, 0, 0.3, 1);
	}

	.link-hover:is(:hover, :focus-visible) .link-hover__graphic--arc :global(path) {
		transition-timing-function: cubic-bezier(0.8, 1, 0.7, 1);
		transition-duration: 0.3s;
	}

	/* Scribble */
	.link-hover--scribble::before {
		display: none;
	}

	.link-hover__graphic--scribble {
		top: 100%;
	}

	.link-hover__graphic--scribble :global(path) {
		transition: stroke-dashoffset 0.6s cubic-bezier(0.7, 0, 0.3, 1);
	}

	.link-hover:is(:hover, :focus-visible) .link-hover__graphic--scribble :global(path) {
		transition-timing-function: cubic-bezier(0.8, 1, 0.7, 1);
		transition-duration: 0.3s;
	}
</style>
