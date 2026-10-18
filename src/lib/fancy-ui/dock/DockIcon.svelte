<script lang="ts" module>
	/** Resting edge length of every icon, in pixels. */
	export const DOCK_BASE_SIZE = 40;

	/**
	 * The magnification curve: a cosine bell rather than a straight line.
	 * Full `magnification` under the pointer, easing smoothly to nothing at
	 * `distance`, with a flat top and flat shoulders — so neighbours swell and
	 * settle instead of forming a tent. Pure, so the React and Vue ports can
	 * share the exact numbers.
	 */
	export function dockIconSize(offset: number, magnification: number, distance: number): number {
		if (!distance || !magnification || !Number.isFinite(offset)) return DOCK_BASE_SIZE;
		const t = Math.min(Math.max(Math.abs(offset) / distance, 0), 1);
		return DOCK_BASE_SIZE + magnification * 0.5 * (1 + Math.cos(Math.PI * t));
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { DOCK_CONTEXT_KEY, type DockContext } from "./types";

	interface Props {
		class?: string;
		children?: import("svelte").Snippet;
	}

	let { class: className = "", children }: Props = $props();

	const context = getContext<DockContext>(DOCK_CONTEXT_KEY);

	let iconRef: HTMLDivElement | undefined = $state();

	// Signed offset from the icon's centre to the pointer along the dock's
	// main axis, plus the icon's own half-extent on that axis. Both in viewport
	// coordinates, the same frame `Dock` records the pointer in.
	let probe = $derived.by(() => {
		const vertical = context.orientation === "vertical";
		const pointer = vertical ? context.mouseY.current : context.mouseX.current;
		// Pointer outside the dock (or never tracked, as on a device that
		// cannot hover): skip the `getBoundingClientRect()` entirely.
		if (!iconRef || !Number.isFinite(pointer)) return { offset: Infinity, half: 0 };

		const bounds = iconRef.getBoundingClientRect();
		return vertical
			? { offset: pointer - bounds.y - bounds.height / 2, half: bounds.height / 2 }
			: { offset: pointer - bounds.x - bounds.width / 2, half: bounds.width / 2 };
	});

	let iconSize = $derived(
		context.magnify
			? dockIconSize(probe.offset, context.magnification, context.distance)
			: DOCK_BASE_SIZE
	);

	// The icon the pointer is over (within its own half-extent) gets the
	// indicator dot. Works under reduced motion too — only the size is frozen.
	let active = $derived(Math.abs(probe.offset) <= probe.half && probe.half > 0);
</script>

<div
	bind:this={iconRef}
	class="dock-icon relative z-[1] flex aspect-square cursor-pointer items-center justify-center rounded-full {className}"
	style:width="{iconSize}px"
	style:height="{iconSize}px"
	data-orientation={context.orientation}
	data-reflection={context.reflection || undefined}
	data-dock-active={active || undefined}
>
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	.dock-icon {
		--_dock-accent: var(--dock-accent, var(--primary, #71717a));
		--_dock-ease: var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
	}

	/* Indicator dot: below the icon on a horizontal dock, beside it on a
	   vertical one. Hidden until the icon is the one under the pointer. */
	.dock-icon::before {
		content: "";
		position: absolute;
		left: 50%;
		top: calc(100% + 4px);
		width: 4px;
		height: 4px;
		margin-left: -2px;
		border-radius: 9999px;
		background: var(--_dock-accent);
		opacity: 0;
		pointer-events: none;
	}
	:global(.dark) .dock-icon::before {
		background: color-mix(in oklab, var(--_dock-accent) 45%, white);
		box-shadow: 0 0 6px 1px color-mix(in oklab, var(--_dock-accent) 55%, transparent);
	}
	.dock-icon[data-orientation="vertical"]::before {
		left: auto;
		right: calc(100% + 4px);
		top: 50%;
		margin-left: 0;
		margin-top: -2px;
	}
	.dock-icon[data-dock-active]::before {
		opacity: 1;
	}

	/* Floor reflection: a soft ellipse under the icon — a contact shadow on
	   the light shelf, a faint glow on the dark one. Sized in percent, so it
	   grows with the magnified icon for free. */
	.dock-icon[data-reflection]::after {
		content: "";
		position: absolute;
		left: 14%;
		right: 14%;
		top: calc(100% - 4px);
		height: 22%;
		border-radius: 50%;
		background: radial-gradient(closest-side, rgba(0, 0, 0, 0.22), transparent);
		filter: blur(3px);
		opacity: 0.7;
		z-index: -1;
		pointer-events: none;
	}
	:global(.dark) .dock-icon[data-reflection]::after {
		background: radial-gradient(
			closest-side,
			color-mix(in oklab, var(--_dock-accent) 26%, transparent),
			transparent
		);
	}
	.dock-icon[data-reflection][data-dock-active]::after {
		opacity: 1;
	}

	@media (prefers-reduced-motion: no-preference) {
		.dock-icon {
			transition:
				width 180ms var(--_dock-ease),
				height 180ms var(--_dock-ease);
		}
		.dock-icon::before,
		.dock-icon[data-reflection]::after {
			transition: opacity 180ms var(--_dock-ease);
		}
	}
</style>
