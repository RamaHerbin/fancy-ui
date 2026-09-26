<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { onMount, untrack } from "svelte";
	import {
		createFluidCursor,
		type FluidCursorEngine,
		type FluidCursorInitOptions,
		type FluidCursorLiveOptions,
	} from "./fluid-cursor-core.js";

	/**
	 * Every simulation prop is documented on `FluidCursorInitOptions` /
	 * `FluidCursorLiveOptions` in `fluid-cursor-core.ts`. All of them but the
	 * six live ones are read once, at mount: the engine snapshots the whole
	 * set and never reacts to a later change. The six on
	 * `FluidCursorLiveOptions` are the ones the running simulation keeps
	 * re-reading, and the effect below forwards them. `dev` is not part of the
	 * public surface — the wrapper fills it in from the bundler.
	 */
	interface Props extends Partial<Omit<FluidCursorInitOptions, "dev"> & FluidCursorLiveOptions> {
		class?: string;
	}

	let {
		simResolution = 128,
		dyeResolution = 1440,
		captureResolution = 512,
		densityDissipation = 3.5,
		velocityDissipation = 2,
		pressure = 0.1,
		pressureIterations = 20,
		curl = 3,
		splatRadius = 0.2,
		splatForce = 6000,
		shading = true,
		colorUpdateSpeed = 10,
		backColor = { r: 0.5, g: 0, b: 0 },
		transparent = true,
		fluidColor,
		fluidColors,
		colorIntensity = 0.15,
		class: className = "",
		autoSplat = false,
		autoSplatInterval = 1500,
		interactive = true,
		pauseWhenHidden = true,
		splatOnMount = false,
		allowMultiple = false,
		contained = true,
		hdr = false,
		hdrBoost = 1.5,
		dither = false,
		ditherPixelSize = 3,
		ditherLevels = 4,
		onReady,
	}: Props = $props();

	let canvasRef: HTMLCanvasElement;
	/** Plain closure state on purpose: nothing rendered depends on the engine. */
	let engine: FluidCursorEngine | null = null;

	onMount(() => {
		if (!canvasRef) return;
		engine = createFluidCursor(
			{ canvas: canvasRef },
			{
				simResolution,
				dyeResolution,
				captureResolution,
				densityDissipation,
				velocityDissipation,
				pressure,
				pressureIterations,
				curl,
				splatRadius,
				splatForce,
				shading,
				colorUpdateSpeed,
				backColor,
				transparent,
				fluidColor,
				fluidColors,
				colorIntensity,
				autoSplat,
				autoSplatInterval,
				interactive,
				pauseWhenHidden,
				splatOnMount,
				allowMultiple,
				contained,
				hdr,
				hdrBoost,
				dither,
				ditherPixelSize,
				ditherLevels,
				onReady,
				dev: import.meta.env.DEV,
			}
		);
		return () => {
			engine?.destroy();
			engine = null;
		};
	});

	// The running engine re-reads these six, exactly as the prop getters it
	// replaced did. The first run only records dependencies; onMount owns the
	// initial values.
	let liveInit = false;
	$effect(() => {
		const next = { fluidColor, fluidColors, contained, interactive, allowMultiple, onReady };
		if (!liveInit) {
			liveInit = true;
			return;
		}
		untrack(() => engine?.setOptions(next));
	});
</script>

<div
	class={cn(
		contained
			? "pointer-events-none absolute inset-0 h-full w-full"
			: "pointer-events-none fixed top-0 left-0 z-50 size-full",
		className
	)}
>
	<canvas
		bind:this={canvasRef}
		class={contained ? "block h-full w-full" : "block h-screen w-screen"}
	></canvas>
</div>
