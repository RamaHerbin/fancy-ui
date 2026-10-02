<script lang="ts" module>
	export interface TooltipItem {
		id: number | string;
		name: string;
		designation: string;
		image: string;
	}

	export interface AnimatedTooltipProps {
		/** Array of items to display */
		items: TooltipItem[];
		/** Additional CSS classes for the container */
		class?: string;
		/**
		 * Tint of the presence ring and the light sweep under the name. Any CSS
		 * colour (`"#f5a97f"`, `"oklch(0.7 0.14 160)"`, `"var(--primary)"`).
		 * Leave unset for the default soft iridescent pair, which adapts to the
		 * light and dark themes.
		 */
		accent?: string;
		/** Avatar diameter in pixels. */
		size?: number;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { createReducedMotion } from "../_internals/motion/media-query.svelte.js";

	let { items, class: className, accent, size = 56 }: AnimatedTooltipProps = $props();

	const reduced = createReducedMotion();
	$effect(() => reduced.start());

	let hoveredId = $state<number | string | null>(null);
	let mouseX = $state(0);

	/** Index of the active item, or -1 when nothing is hovered/focused. */
	let activeIndex = $derived(
		hoveredId === null ? -1 : items.findIndex((item) => item.id === hoveredId)
	);

	// Pointer offset from the avatar centre, normalised to [-1, 1]. The card
	// leans and slides toward the pointer; reduced motion keeps it upright.
	let lean = $derived(reduced.current ? 0 : Math.max(-1, Math.min(1, mouseX / (size / 2))));
	let rotation = $derived(lean * 7);
	let translation = $derived(lean * 14);

	/** How far item `i` steps aside to make room for the active one. */
	function partOffset(i: number): number {
		if (activeIndex < 0 || reduced.current) return 0;
		const d = i - activeIndex;
		const distance = Math.abs(d);
		if (distance === 1) return Math.sign(d) * 6;
		if (distance === 2) return Math.sign(d) * 2;
		return 0;
	}

	let ringStyle = $derived(
		accent
			? `--at-accent: ${accent}; --at-accent-2: color-mix(in oklab, ${accent} 62%, white);`
			: ""
	);

	function handleMouseEnter(event: MouseEvent, itemId: number | string) {
		// Reset mouseX first to prevent offset from previous item
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		mouseX = event.clientX - rect.left - rect.width / 2;
		hoveredId = itemId;
	}

	function handleMouseMove(event: MouseEvent) {
		if (hoveredId === null) return;
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		mouseX = event.clientX - rect.left - rect.width / 2;
	}

	function handleMouseLeave() {
		hoveredId = null;
		mouseX = 0;
	}

	function handleFocusIn(itemId: number | string) {
		mouseX = 0;
		hoveredId = itemId;
	}

	function handleFocusOut() {
		hoveredId = null;
		mouseX = 0;
	}

	function tooltipId(itemId: number | string) {
		return `animated-tooltip-${itemId}`;
	}

	/** Exit: a short settle downward (opacity only under reduced motion). */
	function sink(_node: Element) {
		const still = reduced.current;
		return {
			duration: still ? 120 : 160,
			easing: (t: number) => t * t,
			css: (t: number) =>
				still
					? `opacity: ${t};`
					: `opacity: ${t}; transform: translateY(${(1 - t) * 4}px) scale(${0.97 + 0.03 * t});`,
		};
	}
</script>

<div
	class={cn("at-root flex flex-row items-center", className)}
	style="--_at-size: {size}px; {ringStyle}"
>
	{#each items as item, i (item.id)}
		{@const active = hoveredId === item.id}
		{@const shift = partOffset(i)}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div
			class={cn("at-item group relative", active && "at-active", shift !== 0 && "at-parted")}
			style="--_at-shift: {shift}px;"
			data-active={active ? "" : undefined}
			data-part={shift < 0 ? "before" : shift > 0 ? "after" : undefined}
			onmouseenter={(e) => handleMouseEnter(e, item.id)}
			onmouseleave={handleMouseLeave}
			onmousemove={handleMouseMove}
			onfocusin={() => handleFocusIn(item.id)}
			onfocusout={handleFocusOut}
			tabindex="0"
			aria-describedby={active ? tooltipId(item.id) : undefined}
		>
			<!-- Tooltip -->
			{#if active}
				<div
					id={tooltipId(item.id)}
					role="tooltip"
					class="at-tip pointer-events-none absolute left-1/2 z-50"
					style="transform: translateX(calc(-50% + {translation}px)) rotate({rotation}deg);"
				>
					<div class="at-card" out:sink>
						<span class="at-pointer" aria-hidden="true"></span>
						<div class="at-name">{item.name}</div>
						<span class="at-rule" aria-hidden="true"><span class="at-glint"></span></span>
						<div class="at-role">{item.designation}</div>
					</div>
				</div>
			{/if}

			<!-- Avatar: presence ring + photo -->
			<div class={cn("at-avatar", active && !reduced.current && "at-lifted")}>
				<span class="at-glow" aria-hidden="true"></span>
				<span class="at-disc" aria-hidden="true"></span>
				<span class="at-ring" aria-hidden="true"></span>
				<img
					src={item.image}
					alt={item.name}
					class="at-img relative !m-0 rounded-full object-cover object-top !p-0"
				/>
			</div>
		</div>
	{/each}
</div>

<style>
	@property --at-angle {
		syntax: "<angle>";
		inherits: false;
		initial-value: 0deg;
	}

	.at-root {
		/* Public, class-themeable knobs with private fallbacks. */
		--_at-a: var(--at-accent, oklch(0.62 0.13 295));
		--_at-b: var(--at-accent-2, oklch(0.7 0.1 220));
		--_at-core: color-mix(in oklab, var(--_at-a) 45%, white);
		--_at-sep: var(--at-separator, var(--background, #ffffff));
		--_at-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
		--_at-ease-rise: cubic-bezier(0.34, 1.32, 0.64, 1);
		--_at-ease-inout: cubic-bezier(0.4, 0, 0.2, 1);
		--_at-card-bg: rgba(255, 255, 255, 0.85);
		--_at-card-line: rgba(0, 0, 0, 0.08);
		--_at-card-hi: rgba(255, 255, 255, 0.9);
		--_at-card-shadow: 0 10px 28px -12px rgba(0, 0, 0, 0.28), 0 2px 6px -2px rgba(0, 0, 0, 0.1);
		--_at-name: #111113;
		--_at-role: rgba(0, 0, 0, 0.55);
	}

	:global(.dark) .at-root {
		--_at-a: var(--at-accent, oklch(0.78 0.1 295));
		--_at-b: var(--at-accent-2, oklch(0.83 0.08 210));
		--_at-card-bg: rgba(20, 20, 22, 0.85);
		--_at-card-line: rgba(255, 255, 255, 0.1);
		--_at-card-hi: rgba(255, 255, 255, 0.06);
		--_at-card-shadow: 0 14px 32px -12px rgba(0, 0, 0, 0.8), 0 2px 6px -2px rgba(0, 0, 0, 0.5);
		--_at-name: #f4f4f5;
		--_at-role: rgba(255, 255, 255, 0.55);
	}

	/* ---------- stack ---------- */

	.at-item {
		outline: none;
		transform: translateX(var(--_at-shift, 0px));
	}

	.at-item:not(:last-child) {
		margin-inline-end: calc(var(--_at-size) * -0.285);
	}

	.at-item.at-active {
		z-index: 30;
	}

	.at-avatar {
		position: relative;
		width: var(--_at-size);
		height: var(--_at-size);
		border-radius: 9999px;
		isolation: isolate;
		transform-origin: 50% 60%;
	}

	/* The hairline that separates stacked avatars, in the page colour. */
	.at-disc {
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: 9999px;
		background: var(--_at-sep);
		box-shadow: 0 0 0 2px var(--_at-sep);
	}

	.at-avatar.at-lifted {
		transform: translateY(-4px) scale(1.08);
	}

	.at-img {
		position: absolute;
		inset: 3px;
		width: calc(100% - 6px);
		height: calc(100% - 6px);
		z-index: 3;
	}

	/* The lit ring is the focus indicator; forced-colors mode strips it, so
	   fall back to a system-coloured outline there. */
	@media (forced-colors: active) {
		.at-item:focus-visible .at-avatar {
			outline: 2px solid Highlight;
			outline-offset: 2px;
		}
	}

	/* ---------- presence ring ---------- */

	.at-ring,
	.at-glow {
		position: absolute;
		border-radius: 9999px;
		background: conic-gradient(
			from var(--at-angle),
			var(--_at-a) 0deg,
			var(--_at-b) 150deg,
			var(--_at-core) 205deg,
			var(--_at-a) 260deg,
			var(--_at-a) 360deg
		);
	}

	.at-ring {
		inset: 0;
		z-index: 2;
		padding: 2px;
		-webkit-mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		-webkit-mask-composite: xor;
		mask:
			linear-gradient(#000 0 0) content-box exclude,
			linear-gradient(#000 0 0);
		opacity: 0.35;
		transition: opacity 300ms var(--_at-ease-inout);
	}

	.at-glow {
		inset: -3px;
		z-index: 0;
		filter: blur(7px);
		opacity: 0;
		transition: opacity 300ms var(--_at-ease-inout);
	}

	.at-active .at-ring {
		opacity: 1;
	}

	.at-active .at-glow {
		opacity: 0.55;
	}

	/* ---------- glass card ---------- */

	.at-tip {
		bottom: calc(100% + 12px);
		transform-origin: 50% 100%;
	}

	.at-card {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
		padding: 8px 14px 9px;
		border-radius: 10px;
		white-space: nowrap;
		background: var(--_at-card-bg);
		border: 1px solid var(--_at-card-line);
		box-shadow:
			inset 0 1px 0 var(--_at-card-hi),
			var(--_at-card-shadow);
		-webkit-backdrop-filter: blur(12px) saturate(1.4);
		backdrop-filter: blur(12px) saturate(1.4);
		transform-origin: 50% 100%;
		animation: at-fade 160ms var(--_at-ease-out) both;
	}

	.at-pointer {
		position: absolute;
		left: 50%;
		bottom: -5px;
		width: 9px;
		height: 9px;
		margin-left: -4.5px;
		background: var(--_at-card-bg);
		border-right: 1px solid var(--_at-card-line);
		border-bottom: 1px solid var(--_at-card-line);
		border-bottom-right-radius: 2px;
		transform: rotate(45deg);
		clip-path: polygon(100% 0, 100% 100%, 0 100%);
		-webkit-backdrop-filter: blur(12px);
		backdrop-filter: blur(12px);
	}

	.at-name {
		font-size: 0.8125rem;
		line-height: 1.1rem;
		font-weight: 600;
		letter-spacing: -0.005em;
		color: var(--_at-name);
	}

	.at-role {
		font-size: 0.6875rem;
		line-height: 0.9rem;
		color: var(--_at-role);
	}

	/* One thin line of light under the name: a faint resting hairline plus a
	   glint that sweeps across it once when the card opens. */
	.at-rule {
		position: relative;
		display: block;
		width: 100%;
		min-width: 64px;
		height: 7px;
		margin: -3px 0;
		overflow: clip;
		background: linear-gradient(
				90deg,
				transparent,
				color-mix(in oklab, var(--_at-a) 50%, transparent) 30%,
				color-mix(in oklab, var(--_at-b) 50%, transparent) 70%,
				transparent
			)
			center / 100% 1px no-repeat;
	}

	.at-glint {
		display: none;
	}

	@media (prefers-reduced-motion: no-preference) {
		.at-item {
			transition: transform 380ms var(--_at-ease-out);
		}

		.at-avatar {
			transition: transform 420ms var(--_at-ease-out);
		}

		.at-ring,
		.at-glow {
			transition:
				opacity 300ms var(--_at-ease-inout),
				--at-angle 900ms var(--_at-ease-out);
		}

		.at-active .at-ring,
		.at-active .at-glow {
			--at-angle: 140deg;
		}

		.at-tip {
			transition: transform 240ms var(--_at-ease-out);
		}

		.at-card {
			animation: at-rise 260ms var(--_at-ease-rise) both;
		}

		.at-glint {
			display: block;
			position: absolute;
			top: 3px;
			left: 0;
			width: 60%;
			height: 1px;
			border-radius: 1px;
			background: linear-gradient(
				90deg,
				transparent,
				var(--_at-a) 25%,
				var(--_at-core) 50%,
				var(--_at-b) 75%,
				transparent
			);
			/* Soft halo so a 1px line still reads as light. */
			filter: drop-shadow(0 0 2px var(--_at-a)) drop-shadow(0 0 4px var(--_at-b));
			transform: translateX(-110%);
			animation: at-sweep 760ms var(--_at-ease-inout) 90ms both;
		}
	}

	@keyframes at-rise {
		from {
			opacity: 0;
			transform: translateY(6px) scale(0.94);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	@keyframes at-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes at-sweep {
		from {
			transform: translateX(-110%);
		}
		to {
			transform: translateX(180%);
		}
	}
</style>
