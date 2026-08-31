<script lang="ts" module>
	/**
	 * Props for ReasoningPanel
	 */
	export interface ReasoningPanelProps {
		/** The reasoning trace so far. Hand over a longer string to stream more in. */
		text: string;
		/** Whether the trace is still growing. Drives the timer, the shimmer, and autoscroll. */
		streaming?: boolean;
		/**
		 * Whether the trace is expanded. Bindable, and left alone until either the
		 * component or the reader changes it — see the open-behaviour contract in
		 * the README.
		 */
		open?: boolean;
		/** Header text. */
		label?: string;
		/** Epoch ms the current burst started at. Pins the live timer's origin. */
		since?: number;
		/** Final duration for the summary line. Falls back to what the timer measured. */
		durationMs?: number;
		/** Scroll height of the trace once expanded. */
		maxHeight?: string;
		/** Called whenever the panel opens or closes, by click or on its own. */
		onToggle?: (open: boolean) => void;
		/** Additional CSS classes */
		class?: string;
		/** The root element */
		ref?: HTMLDivElement | null;
		/**
		 * Plays the matching interface cue through the sound controller. Off by
		 * default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
	}
</script>

<script lang="ts">
	import { untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";
	import StreamText from "../_internals/StreamText.svelte";
	import { autoscroll } from "../_internals/autoscroll.js";
	import { createElapsed, formatElapsed } from "../_internals/elapsed.svelte.js";

	let {
		text,
		streaming = false,
		open = $bindable(),
		label = "Reasoning",
		since,
		durationMs,
		maxHeight = "12rem",
		onToggle,
		class: className,
		ref = $bindable(null),
		sound = false,
	}: ReasoningPanelProps = $props();

	/** How long a finished trace stays on screen before folding itself away. */
	const AUTO_COLLAPSE_MS = 600;

	const uid = $props.id();
	const headerId = `${uid}-header`;
	const bodyId = `${uid}-body`;

	// `open` stays undefined until something actually decides: `autoOpen` carries
	// the answer in the meantime, so a consumer that never touches the prop still
	// gets the automatic behaviour and one that binds it still owns the value.
	let autoOpen = $state(false);
	let userToggled = $state(false);
	let measuredMs = $state(0);
	// Plain lets: neither should wake an effect that writes them.
	let wasStreaming = false;
	let collapseTimer: ReturnType<typeof setTimeout> | undefined;
	// The last value `onToggle` was told about. `commit` keeps it in step with
	// its own calls, so the effect below only speaks up for changes that never
	// went through it — a consumer writing straight to a bound variable.
	let lastNotifiedOpen = untrack(() => open ?? autoOpen);

	const elapsed = createElapsed();

	const isOpen = $derived(open ?? autoOpen);
	const duration = $derived(durationMs ?? measuredMs);
	const summary = $derived(
		streaming
			? formatElapsed(elapsed.ms)
			: duration > 0
				? `Thought for ${formatElapsed(duration)}`
				: ""
	);

	function clearCollapseTimer() {
		if (collapseTimer !== undefined) {
			clearTimeout(collapseTimer);
			collapseTimer = undefined;
		}
	}

	function commit(next: boolean) {
		if (untrack(() => open ?? autoOpen) === next) return;
		open = next;
		autoOpen = next;
		lastNotifiedOpen = next;
		onToggle?.(next);
	}

	function toggle() {
		// From here on the reader owns the panel: no more opening or closing on
		// its own behind their back.
		userToggled = true;
		clearCollapseTimer();
		const next = !isOpen;
		// Only this click plays a cue — the streaming auto-open and the 600ms
		// auto-collapse both fold through `commit()` and must stay silent, so the
		// play sits here rather than in `commit()` or the effect that watches it.
		if (sound) soundFx.play(next ? "open" : "close");
		commit(next);
	}

	// Open on the first chunk, fold away a beat after the last one — until the
	// reader takes over. `userToggled` is read untracked so that taking over does
	// not itself re-run this.
	$effect(() => {
		const active = streaming;
		untrack(() => {
			clearCollapseTimer();
			if (active) {
				wasStreaming = true;
				if (!userToggled) commit(true);
				return;
			}
			if (!wasStreaming) return;
			wasStreaming = false;
			if (userToggled) return;
			collapseTimer = setTimeout(() => {
				collapseTimer = undefined;
				commit(false);
			}, AUTO_COLLAPSE_MS);
		});
		return clearCollapseTimer;
	});

	// A consumer that writes straight to a variable bound with `bind:open` moves
	// the panel without going through `commit`, so nothing above reports it. The
	// README promises every change is announced, whichever side caused it.
	$effect(() => {
		const next = isOpen;
		untrack(() => {
			if (next === lastNotifiedOpen) return;
			lastNotifiedOpen = next;
			onToggle?.(next);
		});
	});

	// The timer only exists while the trace grows; its last reading survives as
	// the summary duration.
	$effect(() => {
		if (!streaming) return;
		elapsed.start(since ?? Date.now());
		return () => {
			measuredMs = untrack(() => elapsed.ms);
			elapsed.stop();
		};
	});
</script>

<div
	bind:this={ref}
	class={cn("border-border bg-card/50 w-full rounded-lg border text-sm", className)}
>
	<button
		type="button"
		id={headerId}
		class="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors"
		aria-expanded={isOpen}
		aria-controls={bodyId}
		onclick={toggle}
	>
		<svg
			class="ft-chevron size-3.5 shrink-0"
			class:ft-open={isOpen}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="m9 6 6 6-6 6" />
		</svg>
		<span class="text-foreground font-medium" class:ft-shimmer={streaming}>{label}</span>
		{#if summary}
			<span class="ml-auto text-xs tabular-nums">{summary}</span>
		{/if}
	</button>

	<div class="ft-body" class:ft-open={isOpen}>
		<div class="overflow-hidden">
			<div
				id={bodyId}
				role="group"
				aria-labelledby={headerId}
				inert={!isOpen}
				class="text-muted-foreground overflow-y-auto px-3 pb-3 leading-relaxed"
				style:max-height={maxHeight}
				use:autoscroll={{ enabled: streaming && isOpen, pinOnConnect: true }}
			>
				<StreamText {text} />
			</div>
		</div>
	</div>
</div>

<style>
	/*
	 * 0fr → 1fr on a one-row grid is the only way to transition "auto" height
	 * without measuring anything. The inner wrapper does the clipping.
	 */
	.ft-body {
		display: grid;
		grid-template-rows: 0fr;
	}

	.ft-body.ft-open {
		grid-template-rows: 1fr;
	}

	.ft-chevron.ft-open {
		transform: rotate(90deg);
	}

	/*
	 * Everything that moves lives behind the query, so reduced motion gets the
	 * same three states with nothing to shorten or fall back from.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-body {
			transition: grid-template-rows 260ms cubic-bezier(0.4, 0, 0.2, 1);
		}

		.ft-chevron {
			transition: transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
		}

		.ft-shimmer {
			background-image: linear-gradient(
				100deg,
				currentColor 40%,
				var(--ft-reasoning-shimmer, color-mix(in oklab, currentColor 35%, transparent)) 50%,
				currentColor 60%
			);
			background-size: 250% 100%;
			background-clip: text;
			/* Keep `color` intact: the gradient stops resolve currentColor at this
			   element, so `color: transparent` would blank every stop. Only the glyph
			   fill goes transparent; the clipped gradient supplies the visible text. */
			-webkit-text-fill-color: transparent;
			animation: ft-reasoning-shimmer 1.9s linear infinite;
		}

		@keyframes ft-reasoning-shimmer {
			from {
				background-position: 150% 0;
			}
			to {
				background-position: -50% 0;
			}
		}
	}
</style>
