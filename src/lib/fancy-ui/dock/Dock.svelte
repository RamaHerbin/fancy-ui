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
	// `any-hover`, not `hover`: the unprefixed feature describes only the
	// PRIMARY pointing device, so a hybrid laptop-tablet whose primary input is
	// touch answers `(hover: none)` even with a mouse plugged in — and the dock
	// would then ignore every real mouse move. `any-hover: none` is true only
	// when NO attached device can hover, which is the actual question here.
	// Touch on such a hybrid is suppressed by `pointerType` below instead.
	const coarse = createMediaQuery("(any-hover: none)");
	$effect(() => reduced.start());
	$effect(() => coarse.start());

	// One flag, two reasons: a visitor who asked for less motion, and a device
	// where nothing can hover at all (where the icons under a finger would
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

	// Pointer events, not mouse events, for one reason: `pointerType`. A tap
	// synthesises a `mousemove` indistinguishable from a real one, so on a
	// device that CAN hover but is currently being touched, the mouse-event
	// version magnified around the last tap. Non-primary pointers are dropped
	// too — a second finger has no business moving the magnifier.
	function onPointerMove(e: PointerEvent) {
		if (!magnify) return;
		if (e.pointerType === "touch" || !e.isPrimary) return;
		requestAnimationFrame(() => {
			mouseX.current = e.pageX;
			mouseY.current = e.pageY;
		});
	}

	// Deliberately ungated, unlike `onPointerMove`: if the preference or the
	// pointer type flips while a pointer is already inside the dock, the last
	// tracked position would otherwise stay stuck in `mouseX`/`mouseY` forever.
	// Resetting to Infinity is what returns every icon to its resting size.
	function onPointerLeave() {
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
	onpointermove={onPointerMove}
	onpointerleave={onPointerLeave}
	role="toolbar"
	tabindex="0"
>
	{#if children}
		{@render children()}
	{/if}
</div>
