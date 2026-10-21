<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { TickNavItem } from "./types.js";

	export interface TickNavProps {
		/** The rows, top to bottom. */
		items: TickNavItem[];
		/** Id of the current item. Bindable. */
		value?: string;
		/** Called with the id of an item that is activated and not already current. */
		onValueChange?: (id: string) => void;
		/**
		 * Content of the card that follows the pointer while a row is hovered (or
		 * sits beside a keyboard-focused row). Leave it out and no card is rendered.
		 */
		preview?: Snippet<[TickNavItem]>;
		/** Rows over which the neighbours of the hovered row still react. */
		reach?: number;
		/** Ruler ticks drawn between two rows. */
		minorTicks?: number;
		/**
		 * `"neon"` turns the lines into glowing tubes: proximity raises the glow,
		 * a hot beam of light rides every pluck, labels glow on hover, and the
		 * current line breathes. Made for dark surfaces.
		 */
		variant?: "default" | "neon";
		/** Accessible name of the `<nav>` landmark. */
		ariaLabel?: string;
		/**
		 * Plays a cue each time a mouse or pen plucks a line: `hover` for an
		 * item's line, a softer `tick` for a ruler tick. Off by default; only
		 * audible once the user has enabled sound.
		 */
		sound?: boolean;
		/** Additional CSS classes on the `<nav>`. */
		class?: string;
	}
</script>

<script lang="ts">
	import { untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";
	import { createReducedMotion } from "../_internals/motion/media-query.svelte.js";
	import {
		createTickNavCore,
		TICK_NAV_DEFAULTS,
		TICK_NAV_FLAT_PATH,
		type TickNavCore,
	} from "./tick-nav-core.js";

	let {
		items,
		value = $bindable(),
		onValueChange,
		preview,
		reach = TICK_NAV_DEFAULTS.reach,
		minorTicks = 2,
		variant = "default",
		ariaLabel = "Navigation",
		sound = false,
		class: className,
	}: TickNavProps = $props();

	let root: HTMLElement | undefined = $state();
	let list: HTMLUListElement | undefined = $state();
	/** Row under the pointer or keyboard focus; -1 when none. */
	let active = $state(-1);
	let core: TickNavCore | null = $state(null);

	const reduced = createReducedMotion();
	$effect(() => reduced.start());

	const ticks = $derived(Math.max(0, Math.round(minorTicks)));
	const currentIndex = $derived(items.findIndex((item) => item.id === value));
	const activeItem = $derived(active >= 0 ? items[active] : undefined);

	$effect(() => {
		if (!root || !list) return;
		const instance = createTickNavCore(root, list, {
			...untrack(() => ({ reach, current: currentIndex, reducedMotion: reduced.current })),
			onActiveChange(index) {
				active = index;
			},
			onPluck(kind) {
				if (!sound) return;
				if (kind === "row") soundFx.play("hover");
				else soundFx.play("tick", { volume: 0.6 });
			},
		});
		core = instance;
		return () => {
			instance.destroy();
			core = null;
			active = -1;
		};
	});

	$effect(() => {
		core?.update({ reach, current: currentIndex, reducedMotion: reduced.current });
	});

	// Rows were added, removed or reordered: the core re-reads them after the DOM update.
	$effect(() => {
		void items.map((item) => item.id).join("\u0000");
		core?.refresh();
	});

	function activate(item: TickNavItem, event: MouseEvent): void {
		if (item.disabled) {
			event.preventDefault();
			return;
		}
		if (item.id === value) return;
		value = item.id;
		onValueChange?.(item.id);
	}
</script>

<nav
	bind:this={root}
	aria-label={ariaLabel}
	class={cn("tn-root", className)}
	data-variant={variant === "neon" ? "neon" : undefined}
>
	<ul bind:this={list} class="tn-list">
		{#each items as item, i (item.id)}
			{@const isCurrent = item.id === value}
			<li
				class="tn-item"
				data-current={isCurrent ? "" : undefined}
				data-active={i === active ? "" : undefined}
				data-disabled={item.disabled ? "" : undefined}
			>
				{#if item.href && !item.disabled}
					<a
						class="tn-link"
						href={item.href}
						aria-current={isCurrent ? "page" : undefined}
						onclick={(e) => activate(item, e)}
					>
						<svg class="tn-bar" viewBox="0 0 54 8" preserveAspectRatio="none" aria-hidden="true">
							<path class="tn-path" d={TICK_NAV_FLAT_PATH} />
							{#if variant === "neon"}
								<path class="tn-beam" d={TICK_NAV_FLAT_PATH} pathLength="100" />
							{/if}
						</svg>
						<span class="tn-label">
							{item.label}
							{#if item.badge}<span class="tn-badge">{item.badge}</span>{/if}
						</span>
					</a>
				{:else}
					<button
						type="button"
						class="tn-link"
						disabled={item.disabled}
						aria-current={isCurrent ? "page" : undefined}
						onclick={(e) => activate(item, e)}
					>
						<svg class="tn-bar" viewBox="0 0 54 8" preserveAspectRatio="none" aria-hidden="true">
							<path class="tn-path" d={TICK_NAV_FLAT_PATH} />
							{#if variant === "neon"}
								<path class="tn-beam" d={TICK_NAV_FLAT_PATH} pathLength="100" />
							{/if}
						</svg>
						<span class="tn-label">
							{item.label}
							{#if item.badge}<span class="tn-badge">{item.badge}</span>{/if}
						</span>
					</button>
				{/if}
				{#if ticks > 0 && i < items.length - 1}
					<span class="tn-ticks" aria-hidden="true">
						{#each { length: ticks } as _, k (k)}
							<span class="tn-tick">
								<svg viewBox="0 0 54 8" preserveAspectRatio="none">
									<path class="tn-tick-path" d={TICK_NAV_FLAT_PATH} />
									{#if variant === "neon"}
										<path class="tn-beam" d={TICK_NAV_FLAT_PATH} pathLength="100" />
									{/if}
								</svg>
							</span>
						{/each}
					</span>
				{/if}
			</li>
		{/each}
	</ul>

	{#if preview && activeItem}
		<div class="tn-preview" aria-hidden="true">
			{@render preview(activeItem)}
		</div>
	{/if}
</nav>

<style>
	.tn-root {
		--tn-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
		--tn-border: color-mix(in oklab, currentColor 16%, transparent);
		--tn-row-gap: 0.5rem;
		position: relative;
	}

	.tn-list,
	.tn-item {
		display: flex;
		flex-direction: column;
		gap: var(--tn-row-gap);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* A row is one pixel tall, like the ruler line it sits on; the ::after
	   below gives it a comfortable hit area that overlaps the ticks around it. */
	.tn-link {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		height: 1px;
		margin: 0;
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		color: inherit;
		text-align: left;
		text-decoration: none;
		cursor: pointer;
		outline: none;
	}

	.tn-link::after {
		content: "";
		position: absolute;
		left: 0;
		top: 50%;
		width: 100%;
		height: 1.75rem;
		transform: translateY(-50%);
	}

	.tn-bar {
		flex-shrink: 0;
		width: var(--tn-len, 32px);
		height: 0.5rem;
		overflow: visible;
	}

	.tn-path {
		fill: none;
		stroke: color-mix(in oklab, var(--tn-accent) calc(var(--tn-near, 0) * 100%), var(--tn-border));
		stroke-width: 1.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.tn-item[data-current] .tn-path {
		stroke: var(--tn-accent);
	}

	.tn-label {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		white-space: nowrap;
		opacity: 0.4;
		transition:
			color 150ms ease,
			opacity 150ms ease;
	}

	.tn-item[data-active] .tn-label,
	.tn-item[data-current] .tn-label {
		color: var(--tn-accent);
		opacity: 1;
	}

	.tn-item[data-disabled] .tn-link {
		cursor: not-allowed;
	}

	.tn-item[data-disabled] .tn-label {
		opacity: 0.2;
	}

	.tn-link:focus-visible .tn-label {
		outline: 2px solid var(--tn-accent);
		outline-offset: 4px;
		border-radius: 2px;
	}

	.tn-badge {
		font-size: 0.625rem;
		opacity: 0.7;
	}

	.tn-ticks {
		display: flex;
		flex-direction: column;
		gap: var(--tn-row-gap);
	}

	.tn-tick {
		position: relative;
		display: block;
		height: 1px;
		width: calc(24px + 16px * var(--tn-tick-near, 0));
	}

	.tn-tick svg {
		position: absolute;
		left: 0;
		top: 50%;
		width: 100%;
		height: 0.5rem;
		overflow: visible;
		transform: translateY(-50%);
	}

	.tn-tick-path {
		fill: none;
		stroke: color-mix(
			in oklab,
			var(--tn-accent) calc(var(--tn-tick-near, 0) * 60%),
			var(--tn-border)
		);
		stroke-width: 1;
		stroke-linecap: round;
	}

	.tn-preview {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 20;
		width: 13rem;
		aspect-ratio: 16 / 9;
		overflow: hidden;
		border: 1px solid color-mix(in oklab, currentColor 10%, transparent);
		border-radius: 0.75rem;
		background: var(--tn-preview-bg, Canvas);
		box-shadow:
			0 10px 15px -3px rgb(0 0 0 / 0.1),
			0 4px 6px -4px rgb(0 0 0 / 0.1);
		pointer-events: none;
		opacity: var(--tn-po, 0);
		transform: translate(var(--tn-px, 0), var(--tn-py, 0));
	}
	/* ------------------------------------------------------------------ neon */

	.tn-root[data-variant="neon"] {
		--tn-border: color-mix(in oklab, var(--tn-accent) 22%, transparent);
		/* The hot core of a lit tube: the accent pushed toward white. */
		--tn-hot: color-mix(in oklab, var(--tn-accent) 55%, white);
	}

	.tn-root[data-variant="neon"] .tn-bar,
	.tn-root[data-variant="neon"] .tn-tick svg {
		filter: drop-shadow(0 0 calc(1px + var(--tn-near, 0) * 3px) var(--tn-accent))
			drop-shadow(0 0 calc(var(--tn-near, 0) * 12px) var(--tn-accent));
	}

	.tn-root[data-variant="neon"] .tn-tick svg {
		filter: drop-shadow(0 0 calc(0.5px + var(--tn-tick-near, 0) * 5px) var(--tn-accent));
	}

	.tn-root[data-variant="neon"] .tn-path {
		stroke: color-mix(in oklab, var(--tn-hot) calc(var(--tn-near, 0) * 100%), var(--tn-border));
	}

	.tn-root[data-variant="neon"] .tn-tick-path {
		stroke: color-mix(in oklab, var(--tn-hot) calc(var(--tn-tick-near, 0) * 70%), var(--tn-border));
	}

	/* The beam: a short, near-white dash centred on the wave's head, with a
	   wide halo. Invisible at rest; the core flags a plucking line. */
	.tn-beam {
		fill: none;
		stroke: color-mix(in oklab, white 75%, var(--tn-accent));
		stroke-width: 2.25;
		stroke-linecap: round;
		stroke-dasharray: 16 200;
		stroke-dashoffset: calc(8 - var(--tn-p, 0) * 100);
		opacity: 0;
		filter: drop-shadow(0 0 2px var(--tn-accent)) drop-shadow(0 0 8px var(--tn-accent));
	}

	/* `data-plucking` is set by the core, so Svelte cannot see it: :global. */
	svg:global([data-plucking]) .tn-beam {
		/* Fades out over the last third of the run as the wave dies down. */
		opacity: calc(min(1, (1 - var(--tn-p, 0)) * 3));
	}

	.tn-tick .tn-beam {
		stroke-width: 1.5;
	}

	.tn-root[data-variant="neon"] .tn-item[data-current] .tn-path {
		stroke: var(--tn-hot);
	}

	.tn-root[data-variant="neon"] .tn-item[data-current] .tn-bar {
		animation: tn-breathe 3.2s ease-in-out infinite;
	}

	@keyframes tn-breathe {
		0%,
		100% {
			filter: drop-shadow(0 0 2px var(--tn-accent)) drop-shadow(0 0 6px var(--tn-accent));
		}
		50% {
			filter: drop-shadow(0 0 3px var(--tn-accent)) drop-shadow(0 0 12px var(--tn-accent));
		}
	}

	.tn-root[data-variant="neon"] .tn-item[data-active] .tn-label,
	.tn-root[data-variant="neon"] .tn-item[data-current] .tn-label {
		color: var(--tn-hot);
		text-shadow:
			0 0 6px color-mix(in oklab, var(--tn-accent) 70%, transparent),
			0 0 16px color-mix(in oklab, var(--tn-accent) 45%, transparent);
	}

	.tn-root[data-variant="neon"] .tn-preview {
		border-color: color-mix(in oklab, var(--tn-accent) 45%, transparent);
		box-shadow:
			0 0 0 1px color-mix(in oklab, var(--tn-accent) 20%, transparent),
			0 0 24px -4px color-mix(in oklab, var(--tn-accent) 60%, transparent);
	}

	@media (prefers-reduced-motion: reduce) {
		.tn-root[data-variant="neon"] .tn-item[data-current] .tn-bar {
			animation: none;
		}
	}
</style>
