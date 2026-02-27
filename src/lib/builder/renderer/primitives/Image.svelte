<script lang="ts">
	import { cn } from "$lib/utils";

	interface Props {
		src?: string;
		alt?: string;
		width?: number;
		height?: number;
		objectFit?: string;
		class?: string;
	}

	let {
		src = "",
		alt = "",
		width,
		height,
		objectFit = "cover",
		class: className = "",
	}: Props = $props();

	const fitMap: Record<string, string> = {
		cover: "object-cover",
		contain: "object-contain",
		fill: "object-fill",
		none: "object-none",
	};

	let fitClass = $derived(fitMap[objectFit] ?? "object-cover");
</script>

{#if src}
	<img {src} {alt} {width} {height} class={cn(fitClass, className)} />
{:else}
	<div
		class={cn(
			"bg-muted text-muted-foreground flex h-48 items-center justify-center text-sm",
			className
		)}
	>
		No image
	</div>
{/if}
