<!--
	The detail page's main media. A FancyUI reference runs its demo for real
	(starting on its own unless motion is paused or the demo waits for intent),
	with Play/Pause, Replay and — when the entry has knobs — a Tune panel. An
	external reference shows its own licensed image or video, with its credit.
-->
<script lang="ts">
	import { onMount } from "svelte";
	import { posterFor } from "$lib/inspiration/catalog.js";
	import type { PlaygroundValues, Reference } from "$lib/inspiration/types.js";
	import { createMotionState } from "$lib/stores/motion.svelte.js";
	import InspirationStage from "./InspirationStage.svelte";
	import Poster from "./Poster.svelte";
	import TunePanel from "./TunePanel.svelte";

	interface Props {
		entry: Reference;
	}

	let { entry }: Props = $props();

	const motion = createMotionState();
	const poster = $derived(posterFor(entry));
	const live = $derived(entry.origin === "fancyui" ? entry : null);

	let playing = $state(false);
	let run = $state(0);

	onMount(() => {
		if (live && !motion.paused && live.demo.mount !== "intent") playing = true;
	});

	// Knobs: a working copy of the defaults, reset per entry.
	let values = $state<PlaygroundValues>({});
	$effect.pre(() => {
		values = { ...(live?.demo.defaults ?? {}) };
	});

	let tuneOpen = $state(false);
	let tuneButton = $state<HTMLButtonElement | null>(null);
</script>

<div class="dm">
	{#if live}
		<div class="frame" data-playing={playing || undefined}>
			<Poster {poster} eager />
			{#if playing}
				{#key run}
					<InspirationStage entry={live} {values} eager />
				{/key}
			{/if}
		</div>
		<div class="controls">
			<button type="button" class="ctl" onclick={() => (playing = !playing)}>
				{#if playing}
					<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
						<rect x="4" y="3.5" width="2.6" height="9" rx="0.8" fill="currentColor" />
						<rect x="9.4" y="3.5" width="2.6" height="9" rx="0.8" fill="currentColor" />
					</svg>
					Pause
				{:else}
					<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
						<path d="M5 3.2v9.6L12.6 8z" fill="currentColor" />
					</svg>
					Play
				{/if}
			</button>
			<button
				type="button"
				class="ctl"
				onclick={() => {
					run += 1;
					playing = true;
				}}
			>
				<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
					<path
						d="M3.5 8a4.5 4.5 0 1 0 1.4-3.3M3.5 2.5v2.5H6"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
				Replay
			</button>
			{#if live.demo.knobs?.length}
				<button
					type="button"
					class="ctl"
					bind:this={tuneButton}
					aria-haspopup="dialog"
					aria-expanded={tuneOpen}
					onclick={() => (tuneOpen = true)}
				>
					<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
						<path
							d="M2.5 4.5h7m3 0h1M2.5 11.5h1m3 0h7M10.5 3v3M5 10v3"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
						/>
					</svg>
					Tune
				</button>
			{/if}
		</div>
		{#if live.demo.knobs?.length}
			<TunePanel
				title={entry.title}
				knobs={live.demo.knobs}
				{values}
				open={tuneOpen}
				returnTo={tuneButton}
				onchange={(key, value) => (values = { ...values, [key]: value })}
				onreset={() => (values = { ...(live.demo.defaults ?? {}) })}
				onclose={() => (tuneOpen = false)}
			/>
		{/if}
	{:else if entry.media}
		<figure>
			<div class="frame external">
				{#if entry.media.type === "video"}
					<!-- svelte-ignore a11y_media_has_caption -->
					<video
						src={entry.media.src}
						poster={entry.media.poster}
						width={entry.media.width}
						height={entry.media.height}
						aria-label={entry.media.alt}
						muted
						playsinline
						controls
						preload="metadata"
					></video>
				{:else}
					<img
						src={entry.media.src}
						width={entry.media.width}
						height={entry.media.height}
						alt={entry.media.alt}
						decoding="async"
					/>
				{/if}
			</div>
			<figcaption class="credit fx-mono">{entry.media.credit}</figcaption>
		</figure>
	{:else}
		<div class="frame"><Poster poster={null} /></div>
	{/if}
</div>

<style>
	.dm {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
	}

	.frame {
		position: relative;
		overflow: hidden;
		aspect-ratio: 16 / 10;
		border-radius: 20px;
		background: var(--fx-canvas);
		box-shadow: inset 0 0 0 1px var(--fx-hairline);
		isolation: isolate;
	}

	/* The edge stays on top of the live demo, which paints its own background. */
	.frame::after {
		content: "";
		position: absolute;
		inset: 0;
		z-index: 3;
		border-radius: inherit;
		box-shadow: inset 0 0 0 1px var(--fx-hairline);
		pointer-events: none;
	}

	/* External media is shown whole (letterboxed on the card fill), never
	   cropped: a capture is already framed by whoever made it. Live stages
	   keep their full-bleed poster. */
	.frame.external {
		background: var(--fx-card);
	}

	.frame img,
	.frame video {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.ctl {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		height: 32px;
		padding: 0 12px;
		border-radius: 8px;
		font-size: 13px;
		color: var(--fx-ink-2);
		box-shadow: inset 0 0 0 1px var(--fx-hairline);
		cursor: pointer;
		transition:
			color 180ms var(--fx-ease),
			box-shadow 180ms var(--fx-ease);
	}

	.ctl:hover {
		color: var(--fx-ink);
		box-shadow: inset 0 0 0 1px var(--fx-hairline-strong);
	}

	figure {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin: 0;
	}

	.credit {
		font-size: 11px;
		letter-spacing: 0.06em;
		color: var(--fx-ink-3);
	}

	@media (pointer: coarse) {
		.ctl {
			min-height: 40px;
		}
	}
</style>
