<script lang="ts" module>
	import type { HTMLButtonAttributes } from "svelte/elements";
	import type { ButtonVariant, ButtonSize } from "../button/types.js";
	import type { FollowLabels } from "./follow-core.js";

	export type { FollowLabels };

	export interface FollowButtonProps {
		/**
		 * Whether the viewer follows. Bindable: the committed value is written back
		 * when `onToggle` resolves, never before. A write from the parent while an
		 * attempt is pending wins and drops that attempt.
		 */
		following?: boolean;
		/** Called with the committed value, once per successful attempt. Not called for a rolled-back or superseded one. */
		onFollowingChange?: (following: boolean) => void;
		/**
		 * Called with the value the click asks for. Return nothing to commit at
		 * once, or a promise: resolve commits, reject (or throw) rolls back, shows
		 * the error and announces it. Clicking again after a failure retries.
		 */
		onToggle?: (next: boolean) => void | Promise<unknown>;
		/** Stable accessible name, e.g. "Follow Rama". Defaults to the idle label. */
		label?: string;
		/** Visible text per state; unset keys keep the defaults. */
		labels?: Partial<FollowLabels>;
		/** Visible text and announcement after a failed attempt */
		errorLabel?: string;
		/** How long the error state holds before reverting, in milliseconds */
		resetMs?: number;
		/** Button variant. By default the idle state is `primary` and the following state `outline`. */
		variant?: ButtonVariant;
		/** Passed straight through to the underlying Button */
		size?: ButtonSize;
		/** Disables the button and blocks the toggle */
		disabled?: boolean;
		/** Drops the visible text, keeping the accessible name */
		iconOnly?: boolean;
		/**
		 * Plays the matching interface cue (toggle-on, toggle-off, error) and the
		 * error vibration. Off by default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
		/** Additional CSS classes */
		class?: string;
		/** Element reference */
		ref?: HTMLButtonElement | HTMLAnchorElement | null;
		/** Fires on activation, after the toggle has started. Never called while `disabled` or pending. */
		onclick?: (event: MouseEvent) => void;
	}

	/**
	 * `FollowButtonProps` plus every native attribute and listener of the
	 * `<button>` it renders. Own props win; `type`, `aria-pressed`, `aria-busy`
	 * and `data-state` stay the component's.
	 */
	export type FollowButtonAttributes = FollowButtonProps &
		Omit<HTMLButtonAttributes, keyof FollowButtonProps | "type">;
</script>

<script lang="ts">
	import { untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import Button from "../button/Button.svelte";
	import StatusMorph from "../status-morph/StatusMorph.svelte";
	import { sound as soundFx } from "../sound/sound.svelte.js";
	import { prefersReducedMotion } from "../_internals/motion/anchored.js";
	import {
		adopt,
		announcement,
		cancel,
		clearError,
		createFollowState,
		isThenable,
		morphState,
		press,
		resolveLabels,
		settle,
		shownFollowing,
		visibleLabel,
	} from "./follow-core.js";

	let {
		following = $bindable(false),
		onFollowingChange,
		onToggle,
		label,
		labels,
		errorLabel = "Try again",
		resetMs = 2000,
		variant,
		size = "md",
		disabled = false,
		iconOnly = false,
		sound = false,
		class: className,
		ref = $bindable(null),
		onclick,
		...restProps
	}: FollowButtonAttributes = $props();

	// The machine's snapshot. Replaced wholesale, never mutated, so `$state.raw`.
	let core = $state.raw(createFollowState(untrack(() => following)));

	// The parent speaks: its value wins over a pending attempt or a standing
	// error. Keyed on the prop alone — our own commit writes `following` and
	// `core` to the same value, so the echo finds nothing to do.
	$effect.pre(() => {
		const value = following;
		untrack(() => {
			if (value !== core.following) core = adopt(core, value);
		});
	});

	// Anything still in flight at unmount is stale from here on.
	$effect(() => () => {
		core = cancel(core);
	});

	const resolvedLabels = $derived(resolveLabels(labels));
	const shown = $derived(shownFollowing(core));
	const currentLabel = $derived(visibleLabel(core, resolvedLabels, errorLabel));
	// The accessible name never follows the visible text: a name that changes
	// next to `aria-pressed` would announce the state twice.
	const name = $derived(label ?? restProps["aria-label"] ?? resolvedLabels.follow);
	const showsPreview = $derived(core.phase === "idle" && core.following);
	const failed = $derived(core.phase === "error");

	// With no explicit variant the button flips primary <-> outline, and the
	// outline has a 1px border: reserve it (transparent) in the primary state
	// so the box is identical across idle, following, pending and error.
	const reserveBorder = $derived(variant === undefined);
	const classes = $derived(
		cn(
			"ft-follow",
			(failed || reserveBorder) && "border",
			reserveBorder && !shown && !failed && "border-transparent",
			failed && "ft-follow--failed",
			className
		)
	);

	// The error window. Armed per failure and keyed on the ticket, so a retry or
	// a parent write that lands first is never cleared by a stale timer. 0 means
	// "revert on the next tick", the same reading the copy button gives it.
	$effect(() => {
		if (core.phase !== "error") return;
		const armed = core.ticket;
		const timer = setTimeout(
			() => {
				core = clearError(core, armed);
			},
			resetMs > 0 ? resetMs : 1
		);
		return () => clearTimeout(timer);
	});

	function finish(ticket: number, ok: boolean) {
		const result = settle(core, ticket, ok);
		// Superseded by the parent, a retry or an unmount: it has nothing to say.
		if (result.outcome === "stale") return;
		core = result.state;
		if (ok) {
			following = core.following;
			if (sound) soundFx.play(core.following ? "toggle-on" : "toggle-off");
			onFollowingChange?.(core.following);
		} else if (sound) {
			soundFx.play("error");
		}
	}

	function handleClick(event: MouseEvent) {
		// A click while an attempt is in flight is swallowed: neither the toggle
		// nor the consumer's own handler runs, and nothing is queued.
		const started = press(core);
		if (!started) return;
		// The outcome cue may play after an await, when the transient activation
		// is gone: create/resume the audio context while the gesture is live.
		if (sound && soundFx.enabled) void soundFx.unlock();
		core = started.state;
		const ticket = started.ticket;
		let result: unknown;
		let threw = false;
		try {
			result = onToggle?.(started.next);
		} catch {
			threw = true;
		}
		if (threw) finish(ticket, false);
		else if (isThenable(result)) {
			result.then(
				() => finish(ticket, true),
				() => finish(ticket, false)
			);
		} else finish(ticket, true);
		onclick?.(event);
	}

	// Out 80 ms, in 160 ms: the label swap keeps the OUTGOING text alive for the
	// out beat as a second, `aria-hidden` layer in the same grid cell, while the
	// keyed live span below re-mounts and fades in after that beat. Nothing is
	// measured, so none of it can move the button. `prefersReducedMotion()` is
	// read once per swap: under reduced motion there is no outgoing layer and the
	// text snaps.
	const LEAVE_MS = 80;
	let swapped = $state(false);
	let leaving = $state<string | null>(null);
	let leaveTimer: ReturnType<typeof setTimeout> | undefined;
	let shownLabel = untrack(() => currentLabel);

	$effect.pre(() => {
		const next = currentLabel;
		if (next === shownLabel) return;
		const previous = shownLabel;
		shownLabel = next;
		swapped = true;
		// A second swap inside the out beat (failure, then a retry that resolves
		// at once): `previous` was still in its delayed fade-in and never painted.
		// Keep the layer that IS on screen, and its timer.
		if (leaving !== null) return;
		clearTimeout(leaveTimer);
		if (prefersReducedMotion()) {
			leaving = null;
			return;
		}
		leaving = previous;
		leaveTimer = setTimeout(() => {
			leaving = null;
		}, LEAVE_MS);
	});

	$effect(() => () => clearTimeout(leaveTimer));
</script>

{#snippet glyph()}
	<svg
		class="size-full"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		{#if shown}
			<path d="M20 6 9 17l-5-5" />
		{:else}
			<path d="M12 5v14M5 12h14" />
		{/if}
	</svg>
{/snippet}

<!--
	The inline `style` rides StatusMorph's `{...restProps}` and lands as an
	attribute, which beats its own scoped width rule. `font-size` is set beside
	it so StatusMorph's inner `calc(1em + 1px)` resolves to the same `1rem` and
	the glyph fills the 16px box. `--ft-statusmorph-error` reads the same
	`--ft-status-error` chain the failure skin below resolves, so a theme that
	declares neither token still paints one red on the cross and the border.

	The glyph is driven, not bound: `state` comes from the machine, so the morph
	has no timer of its own (`resetAfter={0}`) and cannot disagree with the
	button about whether an attempt is pending. Its `role="status"` region, which
	it portals to `document.body` and so never joins the button's name, is the
	one live region: silent while loading, assertive on error, "name: outcome".
-->
{#snippet statusIcon()}
	<StatusMorph
		state={morphState(core)}
		tone="semantic"
		resetAfter={0}
		haptic={sound}
		labels={{ loading: "", success: "", error: announcement(name, errorLabel) }}
		idle={glyph}
		style="width: 1rem; height: 1rem; font-size: calc(1rem - 1px); --ft-statusmorph-error: var(--ft-status-error, light-dark(oklch(0.577 0.245 27.325), oklch(0.704 0.191 22.216)))"
	/>
{/snippet}

<Button
	bind:ref
	{...restProps as Record<string, unknown>}
	type="button"
	variant={variant ?? (shown ? "outline" : "primary")}
	{size}
	{disabled}
	label={name}
	class={classes}
	iconStart={statusIcon}
	aria-pressed={shown}
	aria-busy={core.phase === "pending" ? "true" : undefined}
	data-state={core.phase}
	onclick={handleClick}
>
	<!--
		The visible text sits in a one-cell grid stacking four `aria-hidden` ghosts
		(follow, following, unfollow, error) under the live span: the cell is as wide
		as the widest, in pure CSS, so the button never changes width when the text
		swaps and nothing needs measuring (SSR-safe). The unfollow preview is the
		same: a second layer in the live span that a hover or keyboard focus on a
		fine pointer reveals in CSS, so no state, no listener and no layout shift
		carry it.
	-->
	{#if !iconOnly}
		<span class="ft-follow__label">
			<span class="ft-follow__ghost" aria-hidden="true">{resolvedLabels.follow}</span>
			<span class="ft-follow__ghost" aria-hidden="true">{resolvedLabels.following}</span>
			<span class="ft-follow__ghost" aria-hidden="true">{resolvedLabels.unfollow}</span>
			<span class="ft-follow__ghost" aria-hidden="true">{errorLabel}</span>
			{#if leaving !== null}
				<span class="ft-follow__leave" aria-hidden="true">{leaving}</span>
			{/if}
			{#key currentLabel}
				<span
					class="ft-follow__live"
					data-swapped={swapped ? "" : undefined}
					data-preview={showsPreview ? "" : undefined}
				>
					<span class="ft-follow__rest">{currentLabel}</span>
					{#if showsPreview}
						<span class="ft-follow__preview" aria-hidden="true">{resolvedLabels.unfollow}</span>
					{/if}
				</span>
			{/key}
		</span>
	{/if}
</Button>

<style>
	.ft-follow__label {
		display: inline-grid;
		text-align: start;
	}

	.ft-follow__label > * {
		grid-area: 1 / 1;
		white-space: nowrap;
	}

	.ft-follow__ghost {
		visibility: hidden;
		pointer-events: none;
		user-select: none;
	}

	.ft-follow__leave {
		pointer-events: none;
	}

	.ft-follow__live {
		display: inline-grid;
		text-align: start;
	}

	.ft-follow__live > * {
		grid-area: 1 / 1;
	}

	.ft-follow__preview {
		visibility: hidden;
	}

	/* The unfollow preview: a fine pointer over the button, or keyboard focus on
	   it. A touch screen has no hover, so the preview never shows there and the
	   control never carries an affordance only a mouse can reach. Instant, not
	   animated: it is a state read-out, not motion. */
	@media (hover: hover) and (pointer: fine) {
		:global(.ft-follow:is(:hover, :focus-visible))
			.ft-follow__live[data-preview]
			> .ft-follow__rest {
			visibility: hidden;
		}

		:global(.ft-follow:is(:hover, :focus-visible))
			.ft-follow__live[data-preview]
			> .ft-follow__preview {
			visibility: visible;
		}
	}

	/* transform / opacity only ever run under `no-preference`; under reduce the
	   text simply snaps and the script never renders the outgoing layer. */
	@media (prefers-reduced-motion: no-preference) {
		.ft-follow__leave {
			animation: ft-follow-out 80ms var(--ft-ease-in, cubic-bezier(0.7, 0, 0.84, 0)) forwards;
		}

		.ft-follow__live[data-swapped] {
			animation: ft-follow-in 160ms var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1)) 80ms backwards;
		}
	}

	@keyframes ft-follow-out {
		to {
			opacity: 0;
			transform: translateY(-2px);
		}
	}

	@keyframes ft-follow-in {
		from {
			opacity: 0;
			transform: translateY(2px);
		}
	}

	/*
	 * The failure skin reads the family's `--ft-status-error` vocabulary with the
	 * same fallback pair the toast surface uses, so a failed follow next to a
	 * failed toast is one red even in a theme that declares neither. `:global()`
	 * because the class lands on the `<button>` Button renders in its own template.
	 * Unlayered author CSS beats Tailwind's utilities layer, so neither variant's
	 * hover colours bleed back over it.
	 */
	:global(.ft-follow--failed) {
		border-color: color-mix(
			in oklab,
			var(--ft-status-error, light-dark(oklch(0.577 0.245 27.325), oklch(0.704 0.191 22.216))) 35%,
			transparent
		);
		background-color: color-mix(
			in oklab,
			var(--ft-status-error, light-dark(oklch(0.577 0.245 27.325), oklch(0.704 0.191 22.216))) 10%,
			transparent
		);
		color: var(--ft-status-error, light-dark(oklch(0.577 0.245 27.325), oklch(0.704 0.191 22.216)));
	}
</style>
