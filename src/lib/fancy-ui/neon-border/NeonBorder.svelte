<script lang="ts" module>
	import type { Snippet } from "svelte";

	/**
	 * NeonBorder - Dual-color neon glow border effect
	 *
	 * Two gradient layers with blur and drop-shadow create a bicolor neon effect.
	 * Optional rotation animation with half or full coverage.
	 */
	export interface NeonBorderProps {
		/** First neon color */
		color1?: string;
		/** Second neon color */
		color2?: string;
		/** Animation type: none (static), half (50% coverage), full (100% coverage) */
		animationType?: "none" | "half" | "full";
		/** Animation duration in seconds */
		duration?: number;
		/** Additional CSS classes */
		class?: string;
		/** Content */
		children?: Snippet;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		color1 = "#0496ff",
		color2 = "#ff0a54",
		animationType = "half",
		duration = 6,
		class: className,
		children,
	}: NeonBorderProps = $props();

	function getWidth(type: "none" | "half" | "full"): number {
		switch (type) {
			case "none":
				return 12;
			case "half":
				return 50;
			case "full":
				return 100;
		}
	}

	const styleVars = $derived(
		`--neon-duration: ${duration}s; --neon-color1: ${color1}; --neon-color2: ${color2}; --neon-width: ${getWidth(animationType)}%`
	);

	const animated = $derived(animationType !== "none");
</script>

<div
	class={cn(
		"neon-border-container relative z-10 inline-block h-10 w-full max-w-sm overflow-hidden rounded-lg p-px",
		className
	)}
	style={styleVars}
>
	<div class={cn("neon-layer-one rounded-lg", animated && "neon-animated")}></div>
	<div class={cn("neon-layer-two rounded-lg", animated && "neon-animated")}></div>
	{@render children?.()}
</div>

<style>
	.neon-layer-one {
		position: absolute;
		overflow: hidden;
		width: 100%;
		height: 100%;
		filter: blur(1px) drop-shadow(0 0 12px var(--neon-color1));
		z-index: -1;
		inset: 0;
	}

	.neon-layer-one::before {
		content: "";
		position: absolute;
		overflow: hidden;
		top: 0;
		left: 0;
		width: var(--neon-width);
		height: 100%;
		background: linear-gradient(
			135deg,
			var(--neon-color1),
			var(--neon-color1),
			transparent,
			transparent
		);
	}

	.neon-layer-two {
		position: absolute;
		overflow: hidden;
		width: 100%;
		height: 100%;
		filter: blur(1px) drop-shadow(0 0 12px var(--neon-color2));
		z-index: -1;
		inset: 0;
	}

	.neon-layer-two::before {
		content: "";
		position: absolute;
		bottom: 0;
		right: 0;
		overflow: hidden;
		width: var(--neon-width);
		height: 100%;
		background: linear-gradient(
			135deg,
			transparent,
			transparent,
			var(--neon-color2),
			var(--neon-color2)
		);
	}

	@keyframes neon-rotate {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.neon-animated {
		animation: neon-rotate var(--neon-duration) linear infinite;
	}
</style>
