<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";

	let { values }: { values: PlaygroundValues } = $props();

	// Two sibling layers. `.goo` is decorative: blurred, then alpha-thresholded
	// so touching shapes fuse. `.sharp` holds the real buttons, labels and
	// focus rings, so the filter never touches text or accessibility.
	const actions = ["Copy", "Share", "Save", "Delete"] as const;
	const uid = $props.id();
	const filterId = `goo-${uid}`;

	let active = $state(-1);
	let last = $state("");

	const blur = $derived(Number(values.blur ?? 8));
	const lean = $derived(Number(values.lean ?? 10));

	function leanOf(i: number): number {
		if (active < 0 || i === active) return 0;
		return ((i < active ? 1 : -1) * lean) / Math.abs(i - active);
	}
</script>

<div class="flex h-full w-full flex-col items-center justify-center gap-5 p-6">
	<svg width="0" height="0" class="absolute" aria-hidden="true" focusable="false">
		<defs>
			<filter id={filterId} x="-20%" y="-60%" width="140%" height="220%">
				<feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="b" />
				<feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
			</filter>
		</defs>
	</svg>

	<div
		class="gab"
		data-gooey-bar
		role="group"
		aria-label="Actions (prototype)"
		onpointerleave={() => (active = -1)}
		style="--n: {actions.length};"
	>
		<div class="goo" aria-hidden="true" style="filter: url(#{filterId});">
			<span class="hl" class:on={active >= 0} style="--i: {Math.max(active, 0)};"></span>
			{#each actions as _, i (i)}
				<span
					class="blob"
					style="--lean: {leanOf(i)}px; --delay: {active < 0 ? 0 : Math.abs(i - active) * 40}ms;"
				></span>
			{/each}
		</div>
		<div class="sharp">
			{#each actions as label, i (label)}
				<button
					type="button"
					class="act"
					data-active={active === i}
					onpointerenter={() => (active = i)}
					onfocus={() => (active = i)}
					onblur={() => (active = -1)}
					onclick={() => (last = `${label} done`)}
				>
					{label}
				</button>
			{/each}
		</div>
	</div>
	<p class="text-muted-foreground min-h-5 text-xs" role="status" aria-live="polite">{last}</p>
</div>

<style>
	.gab {
		--w: 84px;
		--h: 40px;
		--gap: 6px;
		position: relative;
		width: calc(var(--n) * var(--w) + (var(--n) - 1) * var(--gap));
		height: var(--h);
	}
	.goo,
	.sharp {
		position: absolute;
		inset: 0;
		display: flex;
		gap: var(--gap);
	}
	.goo {
		pointer-events: none;
	}
	.blob,
	.hl {
		width: var(--w);
		height: var(--h);
		border-radius: 999px;
		flex: none;
	}
	.blob {
		background: color-mix(in oklab, var(--foreground) 16%, transparent);
		transform: translateX(var(--lean, 0px));
		transition: transform 280ms cubic-bezier(0.3, 1.4, 0.5, 1) var(--delay, 0ms);
	}
	.hl {
		position: absolute;
		left: 0;
		top: 0;
		background: var(--foreground);
		opacity: 0;
		transform: translateX(calc(var(--i) * (var(--w) + var(--gap)))) scale(0.8);
		transition:
			transform 320ms cubic-bezier(0.3, 1.4, 0.5, 1),
			opacity 160ms ease;
	}
	.hl.on {
		opacity: 1;
		transform: translateX(calc(var(--i) * (var(--w) + var(--gap)))) scale(1);
	}
	.act {
		width: var(--w);
		height: var(--h);
		flex: none;
		border-radius: 999px;
		background: transparent;
		color: var(--foreground);
		font-size: 0.8125rem;
		font-weight: 500;
		transition: color 160ms ease;
	}
	.act[data-active="true"] {
		color: var(--background);
	}
	.act:focus-visible {
		outline: 2px solid var(--ring, var(--foreground));
		outline-offset: 2px;
	}
	/* Snap, never remove the state: reduced motion and touch skip the travel. */
	@media (prefers-reduced-motion: reduce), (pointer: coarse) {
		.blob,
		.hl,
		.act {
			transition: none;
		}
		.blob {
			transform: none;
		}
	}
</style>
