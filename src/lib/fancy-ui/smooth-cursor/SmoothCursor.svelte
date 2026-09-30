<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { SpringConfig } from "./smooth-cursor-core.js";

	export type { SpringConfig };

	export interface SmoothCursorProps {
		/** Custom cursor snippet to replace the default arrow cursor */
		cursor?: Snippet;
		/** Spring physics configuration */
		springConfig?: SpringConfig;
		/** Additional CSS classes */
		class?: string;
		/** Name shown in a pill that trails the arrow. No pill when omitted. */
		label?: string;
		/** Fill colour of the arrow and the name pill (any CSS colour) */
		color?: string;
		/** Rotate the cursor toward its direction of travel (the arrow stays upright when false) */
		rotate?: boolean;
		/** Milliseconds without movement before the name pill dims; 0 disables */
		idleFade?: number;
		/** Spring for the name pill; missing fields derive from `springConfig` (stiffness × 0.55, damping × 1.1) */
		labelSpring?: SpringConfig;
	}

	/** Arrow tip inside the 24×24 default arrow — the pointer's hotspot. */
	const TIP_X = 4;
	const TIP_Y = 3;
</script>

<script lang="ts">
	import { onMount, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { createSmoothCursor, type SmoothCursorEngine } from "./smooth-cursor-core.js";

	let {
		cursor,
		springConfig = {},
		class: className = "",
		label,
		color = "#0e9f6e",
		rotate = false,
		idleFade = 1500,
		labelSpring,
	}: SmoothCursorProps = $props();

	const uid = $props.id();
	const fillId = `smooth-cursor-fill-${uid}`;

	let cursorEl: HTMLDivElement;
	let labelEl: HTMLDivElement | undefined = $state();
	let visible = $state(false);
	let idle = $state(false);
	let engine: SmoothCursorEngine | null = null;

	// The default arrow is pinned by its tip while upright; a custom cursor, or
	// any cursor that rotates with travel, is pinned by its centre (the pivot).
	const hotspot = $derived(!cursor && !rotate ? `-${TIP_X}px -${TIP_Y}px` : "-50% -50%");

	onMount(() => {
		// Read the media query BEFORE creating the engine: the original wrapper
		// had two distinct reduced-motion entry points — a plain assignment at
		// mount (no snap) and a `change` handler that stopped the loop and
		// snapped. Passing the mount value as a creation option keeps
		// `setOptions({ reducedMotion })` reserved for the change event, so both
		// paths stay faithful.
		const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

		engine = createSmoothCursor(
			{ cursor: cursorEl, label: untrack(() => labelEl) ?? null },
			{
				springConfig: untrack(() => springConfig),
				labelSpring: untrack(() => labelSpring),
				rotate: untrack(() => rotate),
				idleFade: untrack(() => idleFade),
				reducedMotion: motionQuery.matches,
				onVisibleChange: (next) => {
					visible = next;
				},
				onIdleChange: (next) => {
					idle = next;
				},
			}
		);

		function onMotionChange(e: MediaQueryListEvent) {
			engine?.setOptions({ reducedMotion: e.matches });
		}

		motionQuery.addEventListener("change", onMotionChange);

		return () => {
			motionQuery.removeEventListener("change", onMotionChange);
			engine?.destroy();
			engine = null;
		};
	});

	$effect(() => {
		const next = springConfig;
		untrack(() => engine?.setOptions({ springConfig: next }));
	});

	$effect(() => {
		const next = labelSpring;
		untrack(() => engine?.setOptions({ labelSpring: next }));
	});

	$effect(() => {
		const next = rotate;
		untrack(() => engine?.setOptions({ rotate: next }));
	});

	$effect(() => {
		const next = idleFade;
		untrack(() => engine?.setOptions({ idleFade: next }));
	});

	// The pill mounts and unmounts with `label`; hand the live node to the engine.
	$effect(() => {
		const next = labelEl ?? null;
		untrack(() => engine?.setLabel(next));
	});
</script>

<div
	aria-hidden="true"
	class={cn(
		"smooth-cursor pointer-events-none fixed top-0 left-0 z-[9999]",
		visible ? "opacity-100" : "opacity-0",
		className
	)}
	style:--_sc-color="var(--smooth-cursor-color, {color})"
>
	<div
		bind:this={cursorEl}
		class="sc-pointer"
		class:sc-pointer--rotate={rotate}
		style:translate={hotspot}
	>
		{#if cursor}
			{@render cursor()}
		{:else}
			<!-- Default cursor: coloured arrowhead with a white rim -->
			<svg
				class="sc-arrow"
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				focusable="false"
			>
				<defs>
					<linearGradient id={fillId} x1="0.1" y1="0" x2="0.75" y2="1">
						<stop offset="0" class="sc-stop-hot" />
						<stop offset="0.55" class="sc-stop-body" />
						<stop offset="1" class="sc-stop-deep" />
					</linearGradient>
				</defs>
				<path
					class="sc-arrow-rim"
					d="M4 3 L19.6 13.9 L10.2 12.7 L7.3 21.7 Z"
					fill="url(#{fillId})"
				/>
			</svg>
		{/if}
	</div>

	{#if label}
		<div bind:this={labelEl} class="sc-label" class:is-idle={idle} data-smooth-cursor-label>
			<span class="sc-label-text">{label}</span>
		</div>
	{/if}
</div>

<style>
	.smooth-cursor {
		--_sc-hot: color-mix(in oklab, var(--_sc-color) 45%, white);
		--_sc-deep: color-mix(in oklab, var(--_sc-color) 82%, black);
		--_sc-ink: var(--smooth-cursor-label-color, #fff);
	}

	.sc-pointer,
	.sc-label {
		position: absolute;
		top: 0;
		left: 0;
		will-change: transform;
	}

	/* The arrow always paints over the pill when the pill catches up behind it. */
	.sc-pointer {
		z-index: 1;
	}

	.sc-arrow {
		display: block;
		overflow: visible;
		filter: drop-shadow(0 1px 1.25px rgb(0 0 0 / 0.32))
			drop-shadow(0 4px 9px color-mix(in oklab, var(--_sc-color) 38%, transparent));
	}

	/* Rotating mode: turn the arrowhead so it points "up" — the engine's 0deg. */
	.sc-pointer--rotate .sc-arrow {
		rotate: 32.5deg;
	}

	.sc-arrow-rim {
		stroke: #fff;
		stroke-width: 3;
		stroke-linejoin: round;
		paint-order: stroke fill;
	}

	.sc-stop-hot {
		stop-color: var(--_sc-hot);
	}
	.sc-stop-body {
		stop-color: var(--_sc-color);
	}
	.sc-stop-deep {
		stop-color: var(--_sc-deep);
	}

	/* Name pill: tucked under the arrow's back edge, square-ish corner pointing at the tip. */
	.sc-label {
		translate: 13px 17px;
		transform-origin: 0 0;
		display: flex;
		align-items: center;
		max-width: 180px;
		height: 22px;
		padding: 0 9px;
		border-radius: 3px 11px 11px 11px;
		background: linear-gradient(
			180deg,
			color-mix(in oklab, var(--_sc-color) 86%, white) 0%,
			var(--_sc-color) 55%,
			color-mix(in oklab, var(--_sc-color) 92%, black) 100%
		);
		color: var(--_sc-ink);
		box-shadow:
			0 0 0 1px rgb(255 255 255 / 0.92),
			inset 0 1px 0 rgb(255 255 255 / 0.28),
			0 1px 2px rgb(0 0 0 / 0.28),
			0 6px 16px -4px color-mix(in oklab, var(--_sc-color) 45%, transparent);
		opacity: 1;
	}

	.sc-label-text {
		overflow: hidden;
		font-size: 12px;
		font-weight: 500;
		line-height: 1;
		letter-spacing: 0.01em;
		white-space: nowrap;
		text-overflow: ellipsis;
		text-shadow: 0 1px 0 rgb(0 0 0 / 0.14);
	}

	.sc-label.is-idle {
		opacity: 0.35;
	}

	@media (prefers-reduced-motion: no-preference) {
		.sc-label {
			transition: opacity 300ms cubic-bezier(0.4, 0, 0.2, 1);
		}
	}
</style>
