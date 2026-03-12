<script lang="ts" module>
	export interface LineShadowTextProps {
		text: string;
		shadowColor?: string;
		as?: "span" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "div";
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		text,
		shadowColor = "black",
		as = "span",
		class: className,
	}: LineShadowTextProps = $props();

	let style = $derived(`--shadow-color: ${shadowColor}`);
</script>

<svelte:element
	this={as}
	class={cn(
		"line-shadow-text relative z-0 inline-flex",
		"after:absolute after:top-[0.04em] after:left-[0.04em] after:-z-10",
		"after:bg-[linear-gradient(45deg,transparent_45%,var(--shadow-color)_45%,var(--shadow-color)_55%,transparent_0)]",
		"after:bg-[length:0.06em_0.06em] after:bg-clip-text after:text-transparent",
		"after:content-[attr(data-text)]",
		className
	)}
	{style}
	data-text={text}
>
	{text}
</svelte:element>

<style>
	:global {
		@keyframes line-shadow {
			0% {
				background-position: 0 0;
			}
			100% {
				background-position: 100% -100%;
			}
		}
	}

	.line-shadow-text::after {
		animation: line-shadow 15s linear infinite;
	}
</style>
