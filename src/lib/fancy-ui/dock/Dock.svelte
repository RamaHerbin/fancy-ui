<script lang="ts">
	import { setContext } from "svelte";
	import { cn } from "$lib/utils";
	import {
		createMediaQuery,
		createReducedMotion,
	} from "../_internals/motion/media-query.svelte.js";
	import {
		DOCK_CONTEXT_KEY,
		type DataOrientation,
		type Direction,
		type DockContext,
	} from "./types";

	interface Props {
		class?: string;
		magnification?: number;
		distance?: number;
		direction?: Direction;
		orientation?: DataOrientation;
		children?: import("svelte").Snippet;
	}

	let {
		class: className = "",
		magnification = 60,
		distance = 140,
		direction = "middle",
		orientation = "horizontal",
		children,
	}: Props = $props();

	// Use object with `current` property so children can read reactive updates
	let mouseX = $state({ current: Infinity });
	let mouseY = $state({ current: Infinity });

	// The magnification is a JS-written inline `width`/`height` on each icon, so
	// a CSS media query cannot stop it — the driver has to. Neither query is
	// touched at construction time: `createMediaQuery` only reaches `window`
	// inside `start()`, and `start()` returns its own teardown, which is why
	// `$effect(() => q.start())` is a complete, SSR-safe one-liner.
	const reduced = createReducedMotion();
	const coarse = createMediaQuery("(hover: none)");
	$effect(() => reduced.start());
	$effect(() => coarse.start());

	// One flag, two reasons: a visitor who asked for less motion, and a device
	// with no real pointer to track (where the icons under a finger would
	// magnify around wherever the last tap happened to land). Either way the
	// icons keep their resting 40px.
	const magnify = $derived(!reduced.current && !coarse.current);

	const context: DockContext = {
		get mouseX() {
			return mouseX;
		},
		get mouseY() {
			return mouseY;
		},
		get magnification() {
			return magnification;
		},
		get distance() {
			return distance;
		},
		get orientation() {
			return orientation;
		},
		get magnify() {
			return magnify;
		},
	};

	setContext(DOCK_CONTEXT_KEY, context);

	function onMouseMove(e: MouseEvent) {
		if (!magnify) return;
		requestAnimationFrame(() => {
			mouseX.current = e.pageX;
			mouseY.current = e.pageY;
		});
	}

	// Deliberately ungated, unlike `onMouseMove`: if the preference or the
	// pointer type flips while a pointer is already inside the dock, the last
	// tracked position would otherwise stay stuck in `mouseX`/`mouseY` forever.
	// Resetting to Infinity is what returns every icon to its resting size.
	function onMouseLeave() {
		requestAnimationFrame(() => {
			mouseX.current = Infinity;
			mouseY.current = Infinity;
		});
	}

	let directionClass = $derived(
		direction === "top" ? "items-start" : direction === "bottom" ? "items-end" : "items-center"
	);
</script>

<div
	class={cn(
		"mx-auto flex h-[58px] w-max gap-4 rounded-2xl border p-2 backdrop-blur-md transition-all supports-backdrop-blur:bg-white/10 supports-backdrop-blur:dark:bg-black/10",
		orientation === "vertical" && "h-max w-[58px] flex-col",
		directionClass,
		className
	)}
	onmousemove={onMouseMove}
	onmouseleave={onMouseLeave}
	role="toolbar"
	tabindex="0"
>
	{#if children}
		{@render children()}
	{/if}
</div>
