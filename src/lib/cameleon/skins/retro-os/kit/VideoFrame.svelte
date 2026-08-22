<script lang="ts" module>
	export interface VideoFrameProps {
		/** poster still, e.g. /videos/demo/poster.jpg */
		poster: string;
		/** titlebar filename from the frozen production data, e.g. "DEMO.MP4" */
		fileLabel: string;
		/** clip length, e.g. "01:31" — frozen data, not content */
		duration: string;
		/** "sm" = 200px stage inside a row, "lg" = 420px standalone hero demo */
		size?: "sm" | "lg";
		/** the lg titlebar badge, e.g. "FULL DEMO" */
		badge?: string;
		/** poster alt text; falls back to the file label */
		alt?: string;
		/** when set the whole stage becomes the play control */
		onOpen?: () => void;
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import PlayBadge from "./PlayBadge.svelte";

	let {
		poster,
		fileLabel,
		duration,
		size = "sm",
		badge,
		alt,
		onOpen,
		class: className,
	}: VideoFrameProps = $props();

	const lg = $derived(size === "lg");
	const posterAlt = $derived(alt ?? fileLabel);
</script>

<!--
	The retro video frame: DOS titlebar + poster stage + centred PlayBadge.

	DEVIATION FROM SPEC-CASES (deliberate): the sm stage is a real <img> with
	object-fit:cover rather than a background-image. Pixel-identical, but it keeps
	the house rule that every image is `loading="lazy"` with a real alt — a CSS
	background can be neither lazy nor described.

	The lg variant's shadow is `.r-shadow-4` rather than the spec's
	`drop-shadow(4px 4px 0)`: the frame has square corners, so the two render
	identically, and a box-shadow avoids a filter containing-block on an element
	that hosts an absolutely positioned badge.

	When `onOpen` is given the STAGE is the button (not a floating overlay
	control), so the click target matches the affordance and keyboard users get
	the same one focus stop. The PlayBadge inside stays aria-hidden.
-->
<div class={cn("r-vframe r-border", lg && "r-vframe-lg r-shadow-4", className)}>
	<div class="r-vframe-bar">
		<span class="r-border r-vframe-dot"></span>
		<span class="r-mono r-vframe-file">{fileLabel}</span>
		{#if lg && badge}
			<span class="r-pixel r-border r-vframe-badge">{badge}</span>
		{/if}
		<span class="r-mono r-vframe-time">{duration}</span>
	</div>

	{#if onOpen}
		<button type="button" class="r-vframe-stage" onclick={onOpen} aria-label="Play {fileLabel}">
			<img src={poster} alt={posterAlt} loading="lazy" class="r-vframe-poster" />
			<PlayBadge size={lg ? 60 : 44} />
		</button>
	{:else}
		<div class="r-vframe-stage">
			<img src={poster} alt={posterAlt} loading="lazy" class="r-vframe-poster" />
			<PlayBadge size={lg ? 60 : 44} />
		</div>
	{/if}
</div>

<style>
	/* border comes from .r-border; the lg variant adds .r-shadow-4 in the markup —
	   the sm frame sits inside a row that already casts a shadow */
	.r-vframe {
		background: var(--r-paper);
	}

	.r-vframe-bar {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 10px;
		border-bottom: 2px solid var(--r-ink);
		background: var(--r-tint-gold);
	}

	.r-vframe-lg .r-vframe-bar {
		padding: 8px 12px;
	}

	.r-vframe-dot {
		width: 8px;
		height: 8px;
		flex: none;
		box-sizing: border-box;
		background: var(--r-rust);
	}

	.r-vframe-file {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 10px;
		font-weight: 700;
	}

	.r-vframe-badge {
		flex: none;
		font-size: 9px;
		background: var(--r-btn);
		padding: 2px 7px;
	}

	.r-vframe-time {
		flex: none;
		font-size: 10px;
		font-weight: 600;
		color: var(--r-muted);
	}

	.r-vframe-lg .r-vframe-time {
		font-size: 11px;
	}

	.r-vframe-stage {
		position: relative;
		display: block;
		width: 100%;
		height: 200px;
		margin: 0;
		padding: 0;
		border: 0;
		background: none;
		appearance: none;
		font: inherit;
		color: inherit;
	}

	.r-vframe-lg .r-vframe-stage {
		height: 420px;
	}

	/* 420px is a portrait slab on a phone; crop it back to a landscape band */
	@media (max-width: 640px) {
		.r-vframe-lg .r-vframe-stage {
			height: 260px;
		}
	}

	button.r-vframe-stage {
		cursor: pointer;
	}

	button.r-vframe-stage:focus-visible {
		outline: 2px solid var(--r-blue);
		outline-offset: -4px;
	}

	.r-vframe-poster {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
	}
</style>
