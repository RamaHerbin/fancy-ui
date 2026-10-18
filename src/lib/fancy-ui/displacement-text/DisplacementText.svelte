<script lang="ts" module>
	export interface DisplacementTextProps {
		/** Text to display */
		text?: string;
		/** Font size in pixels */
		fontSize?: number;
		/** Font family */
		font?: string;
		/** Fixed text color (overrides theme colors) */
		color?: string;
		/** Text color in light mode */
		lightColor?: string;
		/** Text color in dark mode */
		darkColor?: string;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { createDisplacementText, type DisplacementTextEngine } from "./displacement-text-core.js";

	let {
		text = "Hover Me",
		fontSize = 200,
		font = "Inter, sans-serif",
		color,
		lightColor = "#000000",
		darkColor = "#ffffff",
		class: className = "",
	}: DisplacementTextProps = $props();

	let container: HTMLDivElement;
	let engine: DisplacementTextEngine | null = null;

	$effect(() => {
		if (!container) return;

		engine = createDisplacementText(
			{ container },
			untrack(() => ({ text, fontSize, font, color, lightColor, darkColor }))
		);

		return () => {
			engine?.destroy();
			engine = null;
		};
	});

	// Every prop rebuilds the scene — the engine keeps that behaviour.
	$effect(() => {
		const next = { text, fontSize, font, color, lightColor, darkColor };
		untrack(() => engine?.setOptions(next));
	});
</script>

<div
	bind:this={container}
	class={cn("relative h-[400px] w-full", className)}
	role="img"
	aria-label={text}
></div>
