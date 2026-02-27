<script lang="ts">
	import { cn } from "$lib/utils";

	interface Props {
		class?: string;
		borderRadius?: number;
		color?: string | string[];
		borderWidth?: number;
		duration?: number;
	}

	let {
		class: className = "",
		borderRadius = 10,
		color = "#FFF",
		borderWidth = 2,
		duration = 10,
	}: Props = $props();

	let colorString = $derived(Array.isArray(color) ? color.join(",") : color);

	let styles = $derived(`
		--glow-border-radius: ${borderRadius}px;
		--glow-border-width: ${borderWidth}px;
		--glow-duration: ${duration}s;
		background-image: radial-gradient(transparent, transparent, ${colorString}, transparent, transparent);
		background-size: 300% 300%;
		mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
		-webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
		-webkit-mask-composite: xor;
		mask-composite: exclude;
		padding: var(--glow-border-width);
		border-radius: var(--glow-border-radius);
	`);
</script>

<div
	class={cn(
		"animate-glow pointer-events-none absolute inset-0 size-full rounded-[inherit] will-change-[background-position]",
		className
	)}
	style={styles}
></div>

<style>
	@keyframes glow {
		0% {
			background-position: 0% 0%;
		}
		50% {
			background-position: 100% 100%;
		}
		100% {
			background-position: 0% 0%;
		}
	}

	.animate-glow {
		animation: glow var(--glow-duration) linear infinite;
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-glow {
			animation: none;
		}
	}
</style>
