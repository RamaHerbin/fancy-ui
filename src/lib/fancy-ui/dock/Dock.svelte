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
		/** Maximum size increase in pixels. */
		magnification?: number;
		/** Pointer distance over which the magnification falls off. */
		distance?: number;
		/** Cross-axis alignment of the icons. */
		direction?: Direction;
		/** Dock orientation. */
		orientation?: DataOrientation;
		/** A soft pool of accent light inside the shelf that follows the pointer. */
		spotlight?: boolean;
		/** A soft contact shadow / glow ellipse under each icon that grows with it. */
		reflection?: boolean;
		/** Accessible name for the toolbar. */
		ariaLabel?: string;
		children?: import("svelte").Snippet;
	}

	let {
		class: className = "",
		magnification = 60,
		distance = 140,
		direction = "middle",
		orientation = "horizontal",
		spotlight = true,
		reflection = true,
		ariaLabel,
		children,
	}: Props = $props();

	// Use object with `current` property so children can read reactive updates
	let mouseX = $state({ current: Infinity });
	let mouseY = $state({ current: Infinity });

	// Where the pointer sits inside the shelf, in shelf-local pixels. Written to
	// `--dock-x` / `--dock-y`; the spotlight and the lit rim read only those two.
	let spotX = $state(0);
	let spotY = $state(0);
	let hovering = $state(false);

	let shelf: HTMLDivElement | undefined = $state();

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

	// Tracking is wider than magnifying: under reduced motion the pointer is
	// still followed so the indicator dot can mark the icon under it — only the
	// size change is withheld. With nothing that can hover, nothing is tracked.
	const track = $derived(!coarse.current);

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
		get reflection() {
			return reflection;
		},
	};

	setContext(DOCK_CONTEXT_KEY, context);

	// One frame in flight at most: every pointer event overwrites the pending
	// coordinates and the frame applies the latest pair. A leave is just a
	// pending `Infinity`, so a move and a leave in the same frame can never
	// land in the wrong order.
	let frame = 0;
	let pendingX = Infinity;
	let pendingY = Infinity;

	function flush() {
		frame = 0;
		mouseX.current = pendingX;
		mouseY.current = pendingY;
		if (Number.isFinite(pendingX) && Number.isFinite(pendingY)) {
			if (shelf) {
				const rect = shelf.getBoundingClientRect();
				spotX = pendingX - rect.left;
				spotY = pendingY - rect.top;
			}
			hovering = true;
		} else {
			hovering = false;
		}
	}

	function queue(x: number, y: number) {
		pendingX = x;
		pendingY = y;
		if (!frame) frame = requestAnimationFrame(flush);
	}

	$effect(() => () => {
		if (frame && typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
		frame = 0;
	});

	// Pointer events, not mouse events, for one reason: `pointerType`. A tap
	// synthesises a `mousemove` indistinguishable from a real one, so on a
	// device that CAN hover but is currently being touched, the mouse-event
	// version magnified around the last tap. Non-primary pointers are dropped
	// too — a second finger has no business moving the magnifier.
	//
	// clientX/clientY, not pageX/pageY: `DockIcon` measures itself with
	// `getBoundingClientRect()`, which is relative to the VIEWPORT. Page
	// coordinates add the scroll offset, so on a scrolled page every distance
	// was off by exactly that offset and the magnifier swelled somewhere the
	// pointer was not.
	function onPointerMove(e: PointerEvent) {
		if (!track) return;
		if (e.pointerType === "touch" || !e.isPrimary) return;
		queue(e.clientX, e.clientY);
	}

	// Deliberately ungated, unlike `onPointerMove`: if the preference or the
	// pointer type flips while a pointer is already inside the dock, the last
	// tracked position would otherwise stay stuck in `mouseX`/`mouseY` forever.
	// Resetting to Infinity is what returns every icon to its resting size.
	function onPointerLeave() {
		queue(Infinity, Infinity);
	}

	let directionClass = $derived(
		direction === "top" ? "items-start" : direction === "bottom" ? "items-end" : "items-center"
	);
</script>

<div
	bind:this={shelf}
	class={cn(
		"dock-shelf relative isolate mx-auto flex h-[58px] w-max gap-3 rounded-2xl border p-2 backdrop-blur-md backdrop-saturate-150",
		"border-black/[0.08] bg-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.05),0_14px_32px_-14px_rgba(0,0,0,0.22)]",
		"dark:border-white/[0.08] dark:bg-[rgba(20,20,22,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_0_rgba(0,0,0,0.5),0_18px_40px_-14px_rgba(0,0,0,0.8)]",
		orientation === "vertical" && "h-max w-[58px] flex-col",
		directionClass,
		className
	)}
	style:--dock-x="{spotX}px"
	style:--dock-y="{spotY}px"
	data-orientation={orientation}
	data-spotlight={spotlight || undefined}
	data-reflection={reflection || undefined}
	data-hover={hovering || undefined}
	onpointermove={onPointerMove}
	onpointerleave={onPointerLeave}
	role="toolbar"
	aria-label={ariaLabel}
	aria-orientation={orientation}
	tabindex="0"
>
	<span class="dock-deco" aria-hidden="true">
		{#if spotlight}
			<span class="dock-spot"></span>
			<span class="dock-rim"><span class="dock-rim-light"></span></span>
		{/if}
		<span class="dock-frame"></span>
	</span>
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	/* Theme hooks. Every private var reads a public one first, so a consumer
	   can recolour the light from a class without touching this file. */
	.dock-shelf {
		--_dock-accent: var(--dock-accent, var(--primary, #71717a));
		--_dock-spot-size: var(--dock-spotlight-size, 140px);
		--_dock-frame: var(--dock-frame-color, rgba(0, 0, 0, 0.05));
		--_dock-core: color-mix(in oklab, var(--_dock-accent) 45%, white);
		--_dock-ease: var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
		outline: none;
	}
	:global(.dark) .dock-shelf {
		--_dock-frame: var(--dock-frame-color, rgba(255, 255, 255, 0.045));
	}

	.dock-shelf:focus-visible {
		outline: 2px solid color-mix(in oklab, var(--_dock-accent) 55%, transparent);
		outline-offset: 3px;
	}

	/* Decorative stack: clipped to the shelf, painted under the icons. The
	   icons are not clipped — they are siblings, above this layer. */
	.dock-deco {
		position: absolute;
		inset: -1px;
		z-index: 0;
		overflow: hidden;
		border-radius: inherit;
		pointer-events: none;
	}

	/* The nested inner frame: a second hairline just inside the shelf edge,
	   with a faint top-lit fill. */
	.dock-frame {
		position: absolute;
		inset: 4px;
		border: 1px solid var(--_dock-frame);
		border-radius: calc(1rem - 4px);
		background: linear-gradient(to bottom, rgba(255, 255, 255, 0.5), transparent 60%);
	}
	:global(.dark) .dock-frame {
		background: linear-gradient(to bottom, rgba(255, 255, 255, 0.025), transparent 60%);
	}

	/* The spotlight: a blurred pool of accent light with a white-hot core,
	   moved by transform only. Light theme lays a thin tint of the accent
	   into the glass; dark theme screens light onto it. */
	.dock-spot {
		position: absolute;
		left: 0;
		top: 0;
		width: var(--_dock-spot-size);
		height: var(--_dock-spot-size);
		border-radius: 50%;
		background: radial-gradient(
			closest-side,
			color-mix(in oklab, var(--_dock-accent) 20%, transparent) 0%,
			color-mix(in oklab, var(--_dock-accent) 8%, transparent) 45%,
			transparent 100%
		);
		filter: blur(10px);
		opacity: 0;
		transform: translate(calc(var(--dock-x) - 50%), calc(var(--dock-y) - 50%));
		will-change: transform, opacity;
	}
	:global(.dark) .dock-spot {
		background: radial-gradient(
			closest-side,
			color-mix(in oklab, var(--_dock-core) 50%, transparent) 0%,
			color-mix(in oklab, var(--_dock-accent) 20%, transparent) 45%,
			transparent 100%
		);
		mix-blend-mode: screen;
	}

	/* The lit rim: a 1px ring (padding + mask) holding one blurred blob that
	   rides the same transform, so the shelf edge brightens only near the
	   pointer. */
	.dock-rim {
		position: absolute;
		inset: 0;
		padding: 1px;
		border-radius: inherit;
		-webkit-mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		-webkit-mask-composite: xor;
		mask:
			linear-gradient(#000 0 0) content-box exclude,
			linear-gradient(#000 0 0);
		opacity: 0;
	}
	.dock-rim-light {
		position: absolute;
		left: 0;
		top: 0;
		width: 220px;
		height: 96px;
		border-radius: 50%;
		background: radial-gradient(
			closest-side,
			color-mix(in oklab, var(--_dock-accent) 70%, transparent),
			transparent
		);
		transform: translate(calc(var(--dock-x) - 50%), calc(var(--dock-y) - 50%));
	}
	:global(.dark) .dock-rim-light {
		background: radial-gradient(closest-side, var(--_dock-core), transparent);
	}

	.dock-shelf[data-hover] .dock-spot {
		opacity: 1;
	}
	.dock-shelf[data-hover] .dock-rim {
		opacity: 0.9;
	}

	@media (prefers-reduced-motion: no-preference) {
		.dock-spot {
			transition:
				transform 140ms var(--_dock-ease),
				opacity 300ms var(--_dock-ease);
		}
		.dock-rim-light {
			transition: transform 140ms var(--_dock-ease);
		}
		.dock-rim {
			transition: opacity 300ms var(--_dock-ease);
		}
	}

	/* Reduced motion: the light holds still, dim and centred, whether or not a
	   pointer is over the dock — the same composition as a resting frame. */
	@media (prefers-reduced-motion: reduce) {
		.dock-spot,
		.dock-shelf[data-hover] .dock-spot {
			left: 50%;
			top: 50%;
			transform: translate(-50%, -50%);
			opacity: 0.55;
		}
		.dock-rim,
		.dock-shelf[data-hover] .dock-rim {
			opacity: 0;
		}
	}

	/* Nothing can hover: no light to follow. */
	@media (any-hover: none) {
		.dock-spot,
		.dock-rim {
			display: none;
		}
	}
</style>
