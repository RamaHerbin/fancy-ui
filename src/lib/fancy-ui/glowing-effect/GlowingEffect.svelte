<script lang="ts">
	import { cn } from "$lib/utils";
	import { onMount, untrack } from "svelte";
	import { createGlowingEffect, type GlowingEffectEngine } from "./glowing-effect-core.js";

	interface Props {
		blur?: number;
		inactiveZone?: number;
		proximity?: number;
		spread?: number;
		variant?: "default" | "white";
		glow?: boolean;
		class?: string;
		disabled?: boolean;
		movementDuration?: number;
		borderWidth?: number;
	}

	let {
		blur = 0,
		inactiveZone = 0.7,
		proximity = 0,
		spread = 20,
		variant = "default",
		glow = false,
		class: className = "",
		disabled = true,
		movementDuration = 2,
		borderWidth = 1,
	}: Props = $props();

	let containerRef: HTMLDivElement;
	let engine: GlowingEffectEngine | null = null;

	let containerStyle = $derived(
		[
			`--blur: ${blur}px`,
			`--spread: ${spread}`,
			`--start: 0`,
			`--active: 0`,
			`--glowingeffect-border-width: ${borderWidth}px`,
			`--repeating-conic-gradient-times: 5`,
			`--gradient: ${
				variant === "white"
					? `repeating-conic-gradient(from 236.84deg at 50% 50%, var(--black), var(--black) calc(25% / var(--repeating-conic-gradient-times)))`
					: `radial-gradient(circle, #dd7bbb 10%, #dd7bbb00 20%), radial-gradient(circle at 40% 40%, #d79f1e 5%, #d79f1e00 15%), radial-gradient(circle at 60% 60%, #5a922c 10%, #5a922c00 20%), radial-gradient(circle at 40% 60%, #4c7894 10%, #4c789400 20%), repeating-conic-gradient(from 236.84deg at 50% 50%, #dd7bbb 0%, #d79f1e calc(25% / var(--repeating-conic-gradient-times)), #5a922c calc(50% / var(--repeating-conic-gradient-times)), #4c7894 calc(75% / var(--repeating-conic-gradient-times)), #dd7bbb calc(100% / var(--repeating-conic-gradient-times)))`
			}`,
		].join(";")
	);

	onMount(() => {
		if (disabled) return;

		engine = createGlowingEffect(
			{ container: containerRef },
			{ inactiveZone, proximity, movementDuration }
		);

		return () => {
			engine?.destroy();
			engine = null;
		};
	});

	// Live proximity/tween props: the pre-extraction rAF callbacks re-read these
	// on every frame, so they must keep reaching the running engine.
	$effect(() => {
		const next = { inactiveZone, proximity, movementDuration };
		untrack(() => engine?.setOptions(next));
	});
</script>

<div
	class={cn(
		"pointer-events-none absolute -inset-px hidden rounded-[inherit] border opacity-0 transition-opacity",
		glow && "opacity-100",
		variant === "white" && "border-white",
		disabled && "!block"
	)}
	aria-hidden="true"
></div>
<div
	bind:this={containerRef}
	style={containerStyle}
	class={cn(
		"pointer-events-none absolute inset-0 rounded-[inherit] opacity-100 transition-opacity",
		glow && "opacity-100",
		blur > 0 && "blur-[var(--blur)]",
		className,
		disabled && "!hidden"
	)}
	aria-hidden="true"
>
	<div
		class={cn(
			"glow",
			"rounded-[inherit]",
			"after:absolute after:inset-[calc(-1*var(--glowingeffect-border-width))] after:rounded-[inherit] after:content-['']",
			"after:[border:var(--glowingeffect-border-width)_solid_transparent]",
			"after:[background-attachment:fixed] after:[background:var(--gradient)]",
			"after:opacity-[var(--active)] after:transition-opacity after:duration-300",
			"after:[mask-clip:padding-box,border-box]",
			"after:[mask-composite:intersect]",
			"after:[mask-image:linear-gradient(#0000,#0000),conic-gradient(from_calc((var(--start)-var(--spread))*1deg),#00000000_0deg,#fff,#00000000_calc(var(--spread)*2deg))]"
		)}
	></div>
</div>
