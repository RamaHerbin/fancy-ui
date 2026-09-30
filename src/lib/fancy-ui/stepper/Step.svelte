<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface StepProps {
		/**
		 * The step's primary label. Required: with `children` also omitted, a
		 * clickable step's only accessible text is its `sr-only` status span —
		 * every upcoming step in the same `Stepper` would then read as the
		 * identical "not started, button" with nothing to tell them apart.
		 */
		label: string;
		/** Optional secondary line shown under the label. */
		description?: string;
		/** Overrides the bullet's default content (checkmark / number / outline). */
		children?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** Element reference */
		ref?: HTMLLIElement | null;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { STEPPER_KEY, type StepperContext } from "./types.js";

	let {
		label,
		description,
		children,
		class: className,
		ref = $bindable(null),
	}: StepProps = $props();

	// Undefined outside a Stepper: the step then has no shared index or
	// status to derive, and renders as a plain, always-"upcoming",
	// never-clickable item rather than throwing.
	const stepper = getContext<StepperContext | undefined>(STEPPER_KEY);

	// `$props.id()` rather than `_internals/id.ts`'s `uid()`: this needs to
	// be stable and available immediately, including during SSR, and
	// `uid()` is client-only by design (see its own doc comment).
	const id = $props.id();

	// Registers on mount, unregisters on destroy — see Stepper.svelte's
	// `register` for why the whole thing has to happen through `untrack`.
	$effect(() => {
		if (!stepper) return;
		return stepper.register(id);
	});

	const index = $derived(stepper ? stepper.indexOf(id) : -1);

	type StepStatus = "done" | "current" | "upcoming";
	const status = $derived.by((): StepStatus => {
		if (!stepper || index === -1) return "upcoming";
		if (index < stepper.current) return "done";
		if (index === stepper.current) return "current";
		return "upcoming";
	});

	const orientation = $derived(stepper?.orientation ?? "horizontal");
	const clickable = $derived(stepper?.clickable ?? false);
	const isFirst = $derived(index === 0);
	const isLast = $derived(stepper ? index === stepper.count - 1 : true);

	// A rail is the segment between two neighbouring steps, identified by the
	// index of the step it leaves. Horizontally a step draws the rail that
	// arrives at it (so the first step has none); vertically it draws the one
	// that leaves it (so the last step has none). Either way the rail is lit
	// exactly when the step it leaves is done.
	const railFrom = $derived(orientation === "vertical" ? index : index - 1);
	const connectorDone = $derived(stepper && index !== -1 ? railFrom < stepper.current : false);

	const animate = $derived(stepper?.animate ?? false);

	// Order within one run of light, in beats. Moving forward from `origin`
	// (the previous active step), rail k lights `k - origin` beats after the
	// first one; moving back, rails retract from the far end first. Clamped at
	// 0: anything outside the run moves (if at all) immediately.
	const origin = $derived(stepper?.origin ?? 0);
	const forward = $derived(stepper ? stepper.current >= origin : true);
	const railOrder = $derived(Math.max(0, forward ? railFrom - origin : origin - 1 - railFrom));

	// A step the light is travelling *to* (past the origin, up to and
	// including the new current one) settles when the light reaches it:
	// its incoming rail's beat, plus the part of a sweep it takes the head to
	// arrive. `undefined` leaves the CSS fallback (no delay) in charge.
	const arrival = $derived(
		stepper && forward && index > origin && index <= stepper.current
			? index - origin - 1 + 0.6
			: undefined
	);

	function handleClick() {
		if (!stepper || !clickable || index === -1) return;
		stepper.select(index);
	}

	const STATUS_TEXT: Record<StepStatus, string> = {
		done: "completed",
		current: "current step",
		upcoming: "not started",
	};

	const bulletClasses = $derived(
		cn(
			"ft-step-bullet relative inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums",
			status === "done" && "ft-step-bullet-done",
			status === "current" && "ft-step-bullet-current ft-step-bullet-halo",
			status === "upcoming" && "ft-step-bullet-upcoming text-muted-foreground"
		)
	);
</script>

{#snippet bulletContent()}
	<span class={bulletClasses} data-status={status} style:--ft-step-arrival={arrival}>
		{#if children}
			{@render children()}
		{:else if status === "done"}
			<svg
				class="ft-step-glyph ft-step-check size-3.5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.75"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M20 6 9 17l-5-5" pathLength="1" />
			</svg>
		{:else}
			<span class="ft-step-glyph" aria-hidden="true">{index + 1}</span>
		{/if}
		<span class="sr-only"> {STATUS_TEXT[status]}</span>
	</span>
{/snippet}

{#snippet textContent()}
	<span
		class="flex flex-col"
		class:items-center={orientation === "horizontal"}
		class:text-center={orientation === "horizontal"}
	>
		{#if label}
			<span
				class={cn(
					"ft-step-label text-xs transition-colors",
					status === "current" && "text-foreground font-medium",
					status === "done" && "text-foreground/80",
					status === "upcoming" && "text-muted-foreground"
				)}
			>
				{label}
			</span>
		{/if}
		{#if description}
			<span class="ft-step-description text-muted-foreground/80 text-[11px] leading-snug">
				{description}
			</span>
		{/if}
	</span>
{/snippet}

<li
	bind:this={ref}
	class={cn(
		"ft-step flex",
		orientation === "vertical"
			? cn("flex-row items-stretch gap-3", isLast ? "pb-0" : "pb-7")
			: cn("flex-col items-center", isFirst ? "flex-none" : "flex-1"),
		animate && "ft-step-animate",
		className
	)}
	data-status={status}
	data-orientation={orientation}
	aria-current={status === "current" ? "step" : undefined}
>
	{#if orientation === "horizontal"}
		<div class="flex w-full items-start">
			{#if !isFirst}
				<span
					class={cn(
						"ft-step-connector bg-border relative mx-1.5 mt-[13px] h-0.5 flex-1 rounded-full",
						connectorDone && "ft-step-connector-done ft-step-connector-lit"
					)}
					style:--ft-step-order={railOrder}
					aria-hidden="true"
				></span>
			{/if}
			{#if clickable}
				<button
					type="button"
					class="ft-step-trigger flex shrink-0 cursor-pointer flex-col items-center gap-1.5 px-1 focus-visible:outline-none"
					onclick={handleClick}
				>
					{@render bulletContent()}
					{@render textContent()}
				</button>
			{:else}
				<div class="ft-step-trigger flex shrink-0 flex-col items-center gap-1.5 px-1">
					{@render bulletContent()}
					{@render textContent()}
				</div>
			{/if}
		</div>
	{:else}
		<!--
		  `-mb-7` mirrors the li's own `pb-7`: without it the bullet column
		  stretches only to the li's content box, which is barely taller than
		  the bullet, so the rail's `flex-1` resolved to ~0px and the vertical
		  rail never showed. Reaching into the padding gives it the gap to span.
		-->
		<div class={cn("flex flex-col items-center self-stretch", !isLast && "-mb-7")}>
			{@render bulletContent()}
			{#if !isLast}
				<span
					class={cn(
						"ft-step-connector bg-border relative my-1 w-0.5 flex-1 rounded-full",
						connectorDone && "ft-step-connector-done ft-step-connector-lit"
					)}
					style:--ft-step-order={railOrder}
					aria-hidden="true"
				></span>
			{/if}
		</div>
		{#if clickable}
			<button
				type="button"
				class="ft-step-trigger flex cursor-pointer flex-col gap-0.5 pt-0.5 text-left focus-visible:outline-none"
				onclick={handleClick}
			>
				{@render textContent()}
			</button>
		{:else}
			<div class="ft-step-trigger flex flex-col gap-0.5 pt-0.5 text-left">
				{@render textContent()}
			</div>
		{/if}
	{/if}
</li>

<style>
	/*
	 * The only place this component reaches for the brand purple — the
	 * current bullet's fill/halo and a lit rail. No semantic token owns it,
	 * so it's declared locally with a light-dark() fallback, retintable from
	 * higher up the tree via `--ft-accent`. Mirrors ToggleGroupItem's
	 * identical `--ft-toggle-group-accent` pattern. Never redeclare
	 * `--ft-accent` itself: that would shadow whatever an ancestor set, the
	 * exact bug an earlier wave shipped in `Link`.
	 *
	 * Every private `--_x` reads a public `--ft-step-*` first, so a consumer
	 * can retune the rail from a class without touching this file.
	 */
	.ft-step {
		--ft-nav-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
		/* What a lit rail settles to: the accent at reduced strength. */
		--_rail: var(--ft-step-rail, color-mix(in oklab, var(--ft-nav-accent) 58%, transparent));
		/* The head of the travelling light. White-hot on dark; on a light
		 * surface a white core would vanish, so it stays close to the accent. */
		--_hot: var(
			--ft-step-glint,
			light-dark(
				color-mix(in oklab, var(--ft-nav-accent) 82%, white),
				color-mix(in oklab, var(--ft-nav-accent) 45%, white)
			)
		);
		--_sweep: var(--ft-step-sweep-duration, 420ms);
		/* One beat = how far behind the previous rail the next one lights, so
		 * a multi-step jump reads as a single run of light. */
		--_beat: calc(var(--_sweep) * 0.7);
		--_ease-out: var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
	}

	/*
	 * A step's whole visible state — the bullet's fill, its label colour, the
	 * halo around the current one, and the rail behind it — eases in on the
	 * same clock as everything else in the library.
	 *
	 * Declared outside any `prefers-reduced-motion` query on purpose: none of
	 * these properties moves anything. A colour that crossfades and a static
	 * ring that appears are state changes, not travel, and suppressing them
	 * under reduced motion would make the stepper flicker rather than settle.
	 * The focus ring is safe from this list because it lives on a different
	 * element (`.ft-step-trigger`), so no `box-shadow` here is ever a focus
	 * indicator.
	 *
	 * 150ms = tokens.DURATIONS.fast, cubic-bezier(0.4, 0, 0.2, 1) = tokens.EASINGS.inout
	 */
	.ft-step-bullet,
	.ft-step-connector,
	.ft-step-connector::before {
		--ft-step-signal: var(--ft-step-signal-duration, var(--ft-duration-fast, 150ms))
			var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1));
		transition:
			background-color var(--ft-step-signal),
			color var(--ft-step-signal),
			box-shadow var(--ft-step-signal);
	}

	/* ---------------------------------------------------------------- bullets */

	/*
	 * The outline is an inset box-shadow, not a border: it then rides the
	 * same (possibly delayed) transition as the fill, so a step the light is
	 * still travelling towards keeps its ring until the light lands instead
	 * of dropping it the instant `current` changes.
	 */
	.ft-step-bullet-upcoming {
		background: color-mix(in oklab, currentColor 5%, transparent);
		box-shadow: inset 0 0 0 1px
			var(--ft-step-outline, var(--border, color-mix(in oklab, currentColor 22%, transparent)));
	}

	.ft-step-bullet-done {
		background: var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)));
		color: light-dark(oklch(1 0 0), oklch(0.15 0 0));
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.22),
			0 1px 2px rgb(0 0 0 / 0.12);
	}

	.ft-step-bullet-current {
		background: var(--ft-nav-accent);
		color: light-dark(oklch(1 0 0), oklch(0.15 0 0));
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.28),
			0 1px 2px rgb(0 0 0 / 0.14);
	}

	/*
	 * The halo lives on its own layer so it can breathe through `opacity`
	 * alone — never re-painting a box-shadow per frame, never scaling. At
	 * rest (SSR, reduced motion) it is simply on.
	 */
	.ft-step-bullet-halo::before {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
		box-shadow:
			0 0 0 4px color-mix(in oklab, var(--ft-nav-accent) 18%, transparent),
			0 0 18px 2px color-mix(in oklab, var(--ft-nav-accent) 30%, transparent);
	}

	.ft-step-glyph {
		display: inline-block;
	}

	/* ------------------------------------------------------------------ rails */

	/*
	 * The rail is a hairline track (the connector itself, `bg-border`) with
	 * two layers on top: `::before`, the settled fill, and `::after`, the
	 * light that travels once across it when it lights.
	 *
	 * At rest the fill is full-length and only its colour changes, so the
	 * no-motion path is a pure cross-fade.
	 */
	.ft-step-connector {
		/* Horizontal clip only — the travelling light may glow above and below
		 * the rail but never spill past its ends onto a bullet. */
		clip-path: inset(-10px 0);
	}
	.ft-step[data-orientation="vertical"] .ft-step-connector {
		clip-path: inset(0 -10px);
	}

	.ft-step-connector::before,
	.ft-step-connector::after {
		content: "";
		position: absolute;
		pointer-events: none;
		border-radius: inherit;
	}

	.ft-step-connector::before {
		inset: 0;
		background-color: transparent;
	}
	.ft-step-connector-lit::before {
		background-color: var(--_rail);
	}

	.ft-step-connector::after {
		top: 0;
		bottom: 0;
		left: 0;
		width: 45%;
		opacity: 0;
		background: linear-gradient(
			90deg,
			transparent,
			color-mix(in oklab, var(--ft-nav-accent) 55%, transparent) 45%,
			var(--ft-nav-accent) 78%,
			var(--_hot) 97%,
			var(--_hot)
		);
		filter: drop-shadow(0 0 3px color-mix(in oklab, var(--ft-nav-accent) 80%, transparent));
	}
	.ft-step[data-orientation="vertical"] .ft-step-connector::after {
		right: 0;
		width: auto;
		height: 45%;
		bottom: auto;
		background: linear-gradient(
			180deg,
			transparent,
			color-mix(in oklab, var(--ft-nav-accent) 55%, transparent) 45%,
			var(--ft-nav-accent) 78%,
			var(--_hot) 97%,
			var(--_hot)
		);
	}

	.ft-step-trigger:focus-visible {
		outline: none;
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-nav-accent) 35%, transparent);
		border-radius: 0.375rem;
	}

	/* ----------------------------------------------------------------- motion */

	/*
	 * Everything below travels, so it is doubly gated: the OS preference
	 * (this query) and `.ft-step-animate`, which the root only hands out on
	 * the client once it has read the same preference. The resting state
	 * above is the fallback for both.
	 *
	 * `--ft-step-order` (rails) and `--ft-step-arrival` (bullets) are written
	 * inline by `Step` — beats since the light set off from the previous
	 * active step, so one jump across several steps lights them in sequence.
	 */
	@media (prefers-reduced-motion: no-preference) {
		/* The fill grows along the rail instead of cross-fading, and retracts
		 * the same way when the reader steps back. An unlit fill stays
		 * transparent while collapsed: `.ft-step-animate` lands on elements
		 * already painted (hydration, a post-paint effect, the OS preference
		 * flipping), and a fill that turned the rail colour in that same style
		 * change would show every unlit rail fully lit for its delay, then
		 * retract. Its colour only drops once a retraction has finished
		 * (a 0s transition delayed past the sweep); lighting switches it on
		 * instantly while the fill is still collapsed. */
		.ft-step-animate .ft-step-connector::before {
			transform: scaleX(0);
			transform-origin: left center;
			transition:
				transform var(--_sweep) var(--_ease-out) calc(var(--ft-step-order, 0) * var(--_beat)),
				background-color 0s linear calc(var(--ft-step-order, 0) * var(--_beat) + var(--_sweep));
		}
		.ft-step-animate[data-orientation="vertical"] .ft-step-connector::before {
			transform: scaleY(0);
			transform-origin: center top;
		}
		.ft-step-animate .ft-step-connector-lit::before,
		.ft-step-animate[data-orientation="vertical"] .ft-step-connector-lit::before {
			transform: none;
			transition: transform var(--_sweep) var(--_ease-out)
				calc(var(--ft-step-order, 0) * var(--_beat));
		}

		/* The light: a comet whose head rides exactly on the fill's leading
		 * edge (same duration, same curve, translate range chosen so head =
		 * fill edge), then fades once it has arrived. Keyed on the lit class,
		 * so it plays once each time a rail lights — and once on first paint,
		 * as the arrival. */
		.ft-step-animate .ft-step-connector-lit::after {
			animation:
				ft-step-sweep-x var(--_sweep) var(--_ease-out) calc(var(--ft-step-order, 0) * var(--_beat))
					both,
				ft-step-sweep-fade calc(var(--_sweep) * 0.7) linear
					calc(var(--ft-step-order, 0) * var(--_beat) + var(--_sweep) * 0.6) both;
		}
		.ft-step-animate[data-orientation="vertical"] .ft-step-connector-lit::after {
			animation-name: ft-step-sweep-y, ft-step-sweep-fade;
		}

		/* A bullet the light is heading for settles when it gets there, not
		 * the instant `current` changes. */
		.ft-step-animate .ft-step-bullet {
			transition-delay: calc(var(--ft-step-arrival, 0) * var(--_beat));
		}

		/* The glyph swap: a short flip on whichever glyph just mounted, and the
		 * check stroke drawing itself behind it. */
		.ft-step-animate .ft-step-glyph {
			transform-origin: center;
			animation: ft-step-flip 200ms var(--_ease-out) calc(var(--ft-step-arrival, 0) * var(--_beat))
				both;
		}
		.ft-step-animate .ft-step-check path {
			stroke-dasharray: 1;
			animation: ft-step-draw 320ms var(--_ease-out)
				calc(var(--ft-step-arrival, 0) * var(--_beat) + 60ms) both;
		}

		/* The breathing halo — opacity only, no scale — faded in on arrival
		 * through `filter` so the two animations never fight over `opacity`. */
		.ft-step-animate .ft-step-bullet-halo::before {
			animation:
				ft-step-halo-in 360ms var(--_ease-out) calc(var(--ft-step-arrival, 0) * var(--_beat)) both,
				ft-step-breathe 1.2s ease-in-out infinite alternate;
		}
	}

	@keyframes ft-step-sweep-x {
		from {
			transform: translateX(-100%);
		}
		to {
			/* head (right edge, at 45% width) lands on the rail's far end */
			transform: translateX(122.3%);
		}
	}
	@keyframes ft-step-sweep-y {
		from {
			transform: translateY(-100%);
		}
		to {
			transform: translateY(122.3%);
		}
	}
	@keyframes ft-step-sweep-fade {
		from {
			opacity: 1;
		}
		to {
			opacity: 0;
		}
	}
	@keyframes ft-step-breathe {
		from {
			opacity: 0.5;
		}
		to {
			opacity: 1;
		}
	}
	@keyframes ft-step-halo-in {
		from {
			filter: opacity(0);
		}
		to {
			filter: opacity(1);
		}
	}
	@keyframes ft-step-flip {
		from {
			transform: perspective(60px) rotateX(90deg);
			opacity: 0;
		}
		to {
			transform: perspective(60px) rotateX(0deg);
			opacity: 1;
		}
	}
	@keyframes ft-step-draw {
		from {
			stroke-dashoffset: 1;
		}
		to {
			stroke-dashoffset: 0;
		}
	}
</style>
