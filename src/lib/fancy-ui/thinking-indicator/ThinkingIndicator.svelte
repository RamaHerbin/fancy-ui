<script lang="ts" module>
	import type { Snippet } from "svelte";

	/**
	 * Props for ThinkingIndicator
	 */
	export interface ThinkingIndicatorProps {
		/** What the agent is doing right now, e.g. "Reading files" */
		status: string;
		/** Whether the activity is still in flight: drives the shimmer and the live timer */
		running?: boolean;
		/** `"inline"` is a bare text row; `"pill"` is a bordered chip with a leading pulse dot */
		variant?: "inline" | "pill";
		/** Epoch ms the activity started; the internal stopwatch ticks from it */
		since?: number;
		/** Externally-driven elapsed time in ms; overrides the internal stopwatch */
		elapsedMs?: number;
		/** Show the elapsed duration alongside the status */
		showElapsed?: boolean;
		/** Rendered instead of the status label once `running` is false */
		done?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** Element reference */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { createElapsed, formatElapsed } from "../_internals/elapsed.svelte.js";

	let {
		status,
		running = true,
		variant = "inline",
		since,
		elapsedMs,
		showElapsed = true,
		done,
		class: className,
		ref = $bindable(null),
	}: ThinkingIndicatorProps = $props();

	// Seeded at zero rather than from `since`: reading the wall clock here would
	// happen once on the server and again at hydration, and the two can land on
	// different seconds, leaving the `<time>` text and its `datetime` disagreeing
	// with the markup being hydrated. The effect below reads the real elapsed
	// time immediately after mounting — client-only, as effects never run during
	// SSR — so a row that mounts already finished stays at 0s, which is what the
	// README documents for that case.
	const elapsed = createElapsed();

	// `start` returns its own stop function, which doubles as the effect cleanup:
	// flipping `running` off, swapping in an external `elapsedMs`, or changing
	// `since` all tear the interval down before the next run starts a new one.
	$effect(() => {
		if (running && since !== undefined && elapsedMs === undefined) return elapsed.start(since);
	});

	const hasElapsed = $derived(elapsedMs !== undefined || since !== undefined);
	const effectiveMs = $derived(elapsedMs ?? elapsed.ms);
	const elapsedText = $derived(formatElapsed(effectiveMs));
	// ISO 8601 duration, so the value is machine-readable and not just decorative.
	const elapsedDateTime = $derived(`PT${Math.max(0, Math.floor(effectiveMs / 1000))}S`);
	const showDone = $derived(!running && done !== undefined);
</script>

<div
	bind:this={ref}
	class={cn(
		"ft-thinking inline-flex items-center gap-2 text-sm",
		variant === "pill" && "ft-thinking-pill bg-background/60 rounded-full border px-3 py-1",
		className
	)}
	role="status"
	aria-live="polite"
>
	{#if variant === "pill"}
		<span class="ft-thinking-dot" class:ft-thinking-dot-live={running} aria-hidden="true"></span>
	{/if}

	{#if showDone}
		<span class="ft-thinking-done text-muted-foreground">{@render done?.()}</span>
	{:else}
		<span class="ft-thinking-label text-foreground" class:ft-thinking-shimmer={running}
			>{status}</span
		>
	{/if}

	{#if showElapsed && hasElapsed}
		<!--
			While the timer ticks it is hidden from assistive tech: inside a polite
			live region a visible second counter would otherwise be announced once
			per second. It becomes readable again the moment the activity stops.
		-->
		<time
			class="ft-thinking-elapsed text-muted-foreground tabular-nums"
			datetime={elapsedDateTime}
			aria-hidden={running ? "true" : undefined}>{elapsedText}</time
		>
	{/if}
</div>

<style>
	.ft-thinking {
		/* Everything is expressed relative to currentColor, so one set of values
		   reads correctly in both light and dark themes. */
		--ft-thinking-shimmer-base: color-mix(in oklab, currentColor 45%, transparent);
		--ft-thinking-shimmer-highlight: currentColor;
		--ft-thinking-shimmer-duration: 2.2s;
		--ft-thinking-pulse-duration: 1.6s;
	}

	.ft-thinking-dot {
		position: relative;
		display: inline-block;
		flex: none;
		width: 0.4375rem;
		height: 0.4375rem;
		border-radius: 9999px;
		background: currentColor;
	}

	.ft-thinking-dot::after {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: currentColor;
		opacity: 0;
	}

	/*
	 * Both animations live behind `no-preference`, so reduced motion is not a
	 * degraded variant to maintain: the label keeps its normal colour and the dot
	 * is simply a static dot.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-thinking-shimmer {
			background-image: linear-gradient(
				100deg,
				var(--ft-thinking-shimmer-base) 0%,
				var(--ft-thinking-shimmer-base) 35%,
				var(--ft-thinking-shimmer-highlight) 50%,
				var(--ft-thinking-shimmer-base) 65%,
				var(--ft-thinking-shimmer-base) 100%
			);
			background-size: 250% 100%;
			/* Default `repeat` keeps the gradient tiling over the glyphs for every
			   background-position the sweep visits; `no-repeat` would blank the label
			   whenever the image travels outside the box. */
			-webkit-background-clip: text;
			background-clip: text;
			/* Keep `color` intact: the gradient stops are built from currentColor, and
			   custom properties substitute at the use site — `color: transparent` here
			   would zero every stop and render the label invisible. Only the fill is
			   made transparent so the clipped gradient shows through. */
			-webkit-text-fill-color: transparent;
			animation: ft-thinking-sweep var(--ft-thinking-shimmer-duration) linear infinite;
		}

		.ft-thinking-dot-live::after {
			animation: ft-thinking-pulse var(--ft-thinking-pulse-duration) cubic-bezier(0, 0, 0.2, 1)
				infinite;
		}
	}

	@keyframes ft-thinking-sweep {
		from {
			background-position: 200% 0;
		}
		to {
			background-position: -100% 0;
		}
	}

	@keyframes ft-thinking-pulse {
		0% {
			transform: scale(1);
			opacity: 0.55;
		}
		75%,
		100% {
			transform: scale(2.6);
			opacity: 0;
		}
	}
</style>
