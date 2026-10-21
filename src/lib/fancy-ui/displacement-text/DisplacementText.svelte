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
		/** Upper bound for the renderer's device pixel ratio */
		maxDpr?: number;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { onMount, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import {
		DEFAULT_MAX_DPR,
		STATIC_LAYER_STYLE,
		mountDisplacementText,
		staticTextStyle,
		type DisplacementTextController,
		type DisplacementTextMode,
	} from "./displacement-text-core.js";

	let {
		text = "Hover Me",
		fontSize = 200,
		font = "Inter, sans-serif",
		color,
		lightColor = "#000000",
		darkColor = "#ffffff",
		maxDpr = DEFAULT_MAX_DPR,
		class: className = "",
	}: DisplacementTextProps = $props();

	let container: HTMLDivElement;
	let controller: DisplacementTextController | null = null;

	// Starts "static" so the server (and the first client render) show the real
	// text; the controller promotes to the canvas once motion is allowed and
	// WebGL is available, and drops back when reduced motion turns on.
	let mode: DisplacementTextMode = $state("static");
	let textColor = $state(untrack(() => color ?? lightColor));

	const staticStyle = $derived(staticTextStyle({ fontSize, font }, textColor));

	onMount(() => {
		controller = mountDisplacementText(
			{ container },
			{
				...untrack(() => ({ text, fontSize, font, color, lightColor, darkColor, maxDpr })),
				onChange: (state) => {
					mode = state.mode;
					textColor = state.color;
				},
			}
		);
		return () => {
			controller?.destroy();
			controller = null;
		};
	});

	// Options are diffed by the engine: nothing here rebuilds the scene.
	$effect(() => {
		const next = { text, fontSize, font, color, lightColor, darkColor, maxDpr };
		untrack(() => controller?.setOptions(next));
	});
</script>

<div
	bind:this={container}
	class={cn("relative h-[400px] w-full", className)}
	role="img"
	aria-label={text}
>
	{#if mode === "static"}
		<div
			style:position={STATIC_LAYER_STYLE.position}
			style:inset={STATIC_LAYER_STYLE.inset}
			style:display={STATIC_LAYER_STYLE.display}
			style:align-items={STATIC_LAYER_STYLE.alignItems}
			style:justify-content={STATIC_LAYER_STYLE.justifyContent}
			style:container-type={STATIC_LAYER_STYLE.containerType}
			style:overflow={STATIC_LAYER_STYLE.overflow}
		>
			<span
				style:font-family={staticStyle.fontFamily}
				style:font-size={staticStyle.fontSize}
				style:font-weight={staticStyle.fontWeight}
				style:color={staticStyle.color}
				style:line-height={staticStyle.lineHeight}
				style:white-space={staticStyle.whiteSpace}
				style:transform={staticStyle.transform}>{text}</span
			>
		</div>
	{/if}
</div>
