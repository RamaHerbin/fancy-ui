<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";
	import type { ButtonVariant, ButtonSize } from "../button/types.js";

	export interface CopyButtonProps {
		/** The text written to the clipboard on activation */
		value: string;
		/** Idle label */
		label?: string;
		/** Label shown for `resetMs` after a successful copy */
		copiedLabel?: string;
		/** Label and announcement shown for `resetMs` after a failed copy */
		errorLabel?: string;
		/** How long the copied state holds before reverting, in milliseconds */
		resetMs?: number;
		/** Passed straight through to the underlying Button */
		variant?: ButtonVariant;
		/** Passed straight through to the underlying Button */
		size?: ButtonSize;
		/** Disables the button and blocks the copy */
		disabled?: boolean;
		/** Drops the visible label, moving it to `aria-label` instead */
		iconOnly?: boolean;
		/** Called with the value and whether the write actually succeeded */
		onCopy?: (value: string, ok: boolean) => void;
		/**
		 * Overrides the default icon + label content. The success/failure skins
		 * (border, background, text colour) and the disabled/copy wiring still
		 * apply — set `iconOnly` too if the custom content has no readable text,
		 * so the button keeps an accessible name.
		 */
		children?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** Element reference. Matches Button's own ref type, since CopyButton forwards it there. */
		ref?: HTMLButtonElement | HTMLAnchorElement | null;
		/**
		 * Plays the matching interface cue through the sound controller. Off by
		 * default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
		/** Fires on activation, right after the copy starts. Never called while `disabled`. */
		onclick?: (event: MouseEvent) => void;
	}

	/**
	 * `CopyButtonProps` plus every native attribute and listener of the
	 * `<button>` it renders. Own props win.
	 */
	export type CopyButtonAttributes = CopyButtonProps &
		Omit<HTMLButtonAttributes, keyof CopyButtonProps | "type">;
</script>

<script lang="ts">
	import { untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import Button from "../button/Button.svelte";
	import StatusMorph from "../status-morph/StatusMorph.svelte";
	import type { StatusMorphState } from "../status-morph/StatusMorph.svelte";
	import { createCopy } from "../_internals/clipboard.svelte.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";
	import { prefersReducedMotion } from "../_internals/motion/anchored.js";

	let {
		value,
		label = "Copy",
		copiedLabel = "Copied",
		errorLabel = "Copy failed",
		resetMs = 2000,
		variant = "outline",
		size = "md",
		disabled = false,
		iconOnly = false,
		onCopy,
		children,
		class: className,
		ref = $bindable(null),
		sound = false,
		onclick,
		...restProps
	}: CopyButtonAttributes = $props();

	// Read once, on purpose: `createCopy` takes its reset delay as a constructor
	// argument, not a reactive input, so `resetMs` is not meant to be retuned
	// after the button has mounted. `untrack` says so rather than leaving a
	// compiler hint behind. The same frozen value is handed to StatusMorph
	// below — a reactive `resetAfter` there would let a post-mount `resetMs`
	// retime the glyph without retiming the skin, and the two would then
	// disagree for exactly the difference between them.
	const resetWindow = untrack(() => resetMs);
	const copyState = createCopy(resetWindow);

	// Reads nothing, so it runs once and its teardown is the unmount cleanup.
	$effect(() => copyState.destroy);

	// The same latest-attempt guard `createCopy` keeps for `copied`, kept here
	// for the state this component owns. A permission prompt can hold one write
	// open across a second click, and both promises then resolve in whatever
	// order the user agent settled them: without the ticket, a first click's
	// late failure would repaint the error skin over a second click's success,
	// and `copyState.copied` — which IS ticket-guarded — would disagree with it.
	let attempt = 0;

	// The glyph's own state, two-way bound so StatusMorph's own `resetAfter`
	// timer writes it back to "idle". Deliberately not a second authority for
	// the success window: `createCopy` still owns `copyState.copied` (the skin
	// and the visible label), and both windows are armed in the same tick with
	// the same duration, so no synchronisation code is needed — `handleClick`
	// only has to make sure a repeat click re-arms both rather than one.
	let morphState = $state<StatusMorphState>("idle");

	const currentLabel = $derived(
		morphState === "error" ? errorLabel : copyState.copied ? copiedLabel : label
	);

	// One attempt, one skin. The success class is gated on the ABSENCE of an
	// error, not merely on `copyState.copied`: `createCopy.copy()` returns from
	// its `catch` before it touches that flag, so a failure landing inside a
	// standing success window leaves `copied` true while the glyph is already
	// on "error". Without the guard the button would carry both skins at once
	// and which red-or-green actually painted would come down to the order the
	// compiler happened to emit the two rules in — a coin toss, and a public
	// class list claiming two contradictory outcomes.
	const classes = $derived(
		cn(
			"ft-copybtn",
			copyState.copied && morphState !== "error" && "ft-copybtn--copied border",
			morphState === "error" && "ft-copybtn--failed border",
			className
		)
	);

	async function handleClick(event: MouseEvent) {
		// This click is the only user gesture in the interaction, and the outcome
		// cue below plays after an await: on a reload with sound already enabled
		// no AudioContext exists yet, and by then the transient activation may be
		// gone. Creating/resuming it here, synchronously, keeps that cue audible.
		if (sound && soundFx.enabled) void soundFx.unlock();
		// Clears any standing outcome before the new attempt, for two reasons: the
		// previous confirmation is stale the moment a fresh copy is in flight, and
		// StatusMorph re-arms its reset timer on a state CHANGE only — writing
		// "success" over "success" would leave the glyph on the first click's
		// deadline while `createCopy` restarts the skin's. The await between the
		// two writes is what makes this a real change rather than a no-op
		// collapsed inside a single flush.
		morphState = "idle";
		// `copy()` resolves false instead of throwing on a denied permission or a
		// missing clipboard API — that outcome is reported to the caller honestly,
		// not swallowed into a silent no-op, and is now shown and announced too.
		const mine = ++attempt;
		// `value` is snapshotted: it is a live prop, and a parent that swaps it
		// while a permission prompt holds the write open would otherwise make
		// `onCopy` report text that was never written.
		const attempted = value;
		const pending = copyState.copy(attempted);
		// The consumer click runs now, while the event is still live, so its
		// `preventDefault` / `stopPropagation` mean something.
		onclick?.(event);
		const ok = await pending;
		// `onCopy` still fires for every attempt, stale or not — it reports what
		// that call did, matching `copy()`'s own honest return. Only the visible
		// and audible cues, which describe the button's CURRENT state, are
		// dropped when a newer attempt has already spoken for them.
		if (mine === attempt) {
			morphState = ok ? "success" : "error";
			if (sound) soundFx.play(ok ? "copy" : "error");
		}
		onCopy?.(attempted, ok);
	}

	// Out 80 ms, in 160 ms: the label swap keeps the OUTGOING text alive for the
	// out beat as a second, `aria-hidden` layer in the same grid cell, while the
	// keyed live span below re-mounts and fades in after that beat. The cell is
	// never measured — see the markup — so none of this can move the button.
	// `prefersReducedMotion()` is read once per swap, on purpose: a one-shot
	// answer is all a 80 ms beat needs. Under reduced motion there is no
	// outgoing layer at all: the text snaps.
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

	// StatusMorph's `resetAfter` is what normally walks `morphState` back to
	// "idle", and a custom `children` replaces the whole icon slot — so in that
	// composition nothing owns the timer and a failure would keep the error
	// skin, the error label and the assertive live region forever. The parent
	// takes the timer over for exactly that case, on the same window and with
	// the same 0-means-1ms clamp the morph is handed above.
	$effect(() => {
		if (!children || morphState === "idle") return;
		const timer = setTimeout(
			() => {
				morphState = "idle";
			},
			resetWindow > 0 ? resetWindow : 1
		);
		return () => clearTimeout(timer);
	});
</script>

{#snippet copyIcon()}
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
		<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
		<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
	</svg>
{/snippet}

<!--
	The inline `style` rides StatusMorph's `{...restProps}` and lands as an
	attribute, which beats its own scoped `.ft-statusmorph { width: calc(1em +
	1px) }` — a `class="size-4"` would lose here, because Tailwind utilities are
	layered and StatusMorph's scoped rule is not. `font-size` is set alongside
	it so StatusMorph's INNER `calc(1em + 1px)` (the SVG, which the outer width
	does not reach) resolves to the same `1rem`: the glyph then fills the box
	exactly, holding the 16px footprint the copy icon has today instead of
	sitting 2px short of it in the top-left corner.

	`--ft-statusmorph-error` is set to the SAME chain the failure skin below
	resolves, because the two fallbacks in the family disagree: StatusMorph's
	own last-resort red is `oklch(0.5 0.19 25)` / `oklch(0.7 0.18 25)` and the
	skin's is Toast's `oklch(0.577 0.245 27.325)` / `oklch(0.704 0.191 22.216)`.
	The package ships no stylesheet, so "neither token declared" is the
	out-of-the-box case — and there a 16px cross would sit inside a label and a
	border painted a visibly different red. Reading `--ft-status-error` first
	keeps a theme that sets it winning on both surfaces, exactly as before;
	setting neither now yields one red instead of two. The success pair needs no
	equivalent: both `--ft-status-done` fallbacks are already character-identical.

	`resetAfter` is clamped away from 0 for a vocabulary clash, not a whim: to
	`createCopy` a 0 window means "revert on the next tick", to StatusMorph it
	means "no timer at all, manual reset only". 1ms makes both read the prop the
	same way, so `resetMs={0}` reverts glyph and label together the way it did
	before the glyph existed, instead of stranding the cross on screen forever.
-->
{#snippet statusIcon()}
	<StatusMorph
		bind:state={morphState}
		tone="semantic"
		resetAfter={resetWindow > 0 ? resetWindow : 1}
		labels={{ success: copiedLabel, error: errorLabel }}
		idle={copyIcon}
		style="width: 1rem; height: 1rem; font-size: calc(1rem - 1px); --ft-statusmorph-error: var(--ft-status-error, light-dark(oklch(0.577 0.245 27.325), oklch(0.704 0.191 22.216)))"
	/>
{/snippet}

<Button
	bind:ref
	{...restProps as Record<string, unknown>}
	type="button"
	{variant}
	{size}
	{disabled}
	label={iconOnly ? currentLabel : undefined}
	class={classes}
	iconStart={children ? undefined : statusIcon}
	onclick={handleClick}
>
	{#if children}
		{@render children()}
	{/if}
	<!-- The announcement is StatusMorph's job, through the `role="status"` region
	     it portals to `document.body` (which is also why it never joins this
	     button's accessible name), and two live regions would double-announce
	     every copy. The one case with no StatusMorph at all is a custom
	     `children`, which replaces `iconStart` — there the span keeps the
	     announcement, because a custom snippet has no way of its own to say the
	     copy landed and colour alone is a sighted-only signal. When something
	     else already owns the visible label (icon-only, or a custom `children`)
	     the span is `sr-only` and there is nothing to reserve width for.

	     Otherwise the label sits in a one-cell grid stacking three `aria-hidden`
	     ghosts (idle, copied, failed) under the live span: the cell is as wide
	     as the widest of them, in pure CSS, so the button never changes width
	     when the text swaps and nothing needs measuring (SSR-safe). -->
	{#if iconOnly || children}
		<span
			class="ft-copybtn__live sr-only"
			aria-live={children ? (morphState === "error" ? "assertive" : "polite") : undefined}
			>{currentLabel}</span
		>
	{:else}
		<span class="ft-copybtn__label">
			<span class="ft-copybtn__ghost" aria-hidden="true">{label}</span>
			<span class="ft-copybtn__ghost" aria-hidden="true">{copiedLabel}</span>
			<span class="ft-copybtn__ghost" aria-hidden="true">{errorLabel}</span>
			{#if leaving !== null}
				<span class="ft-copybtn__leave" aria-hidden="true">{leaving}</span>
			{/if}
			{#key currentLabel}
				<span class="ft-copybtn__live" data-swapped={swapped ? "" : undefined}>{currentLabel}</span>
			{/key}
		</span>
	{/if}
</Button>

<style>
	.ft-copybtn__label {
		display: inline-grid;
		text-align: start;
	}

	.ft-copybtn__label > * {
		grid-area: 1 / 1;
		white-space: nowrap;
	}

	.ft-copybtn__ghost {
		visibility: hidden;
		pointer-events: none;
		user-select: none;
	}

	.ft-copybtn__leave {
		pointer-events: none;
	}

	/* transform / opacity only ever run under `no-preference`; under reduce the
	   text simply snaps and the script never renders the outgoing layer. */
	@media (prefers-reduced-motion: no-preference) {
		.ft-copybtn__leave {
			animation: ft-copybtn-out 80ms var(--ft-ease-in, cubic-bezier(0.7, 0, 0.84, 0)) forwards;
		}

		.ft-copybtn__live[data-swapped] {
			animation: ft-copybtn-in 160ms var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1)) 80ms
				backwards;
		}
	}

	@keyframes ft-copybtn-out {
		to {
			opacity: 0;
			transform: translateY(-2px);
		}
	}

	@keyframes ft-copybtn-in {
		from {
			opacity: 0;
			transform: translateY(2px);
		}
	}

	/*
	 * `--ft-status-done` / `--ft-status-error` are the family's actual
	 * "operation landed" and "operation failed" vocabulary — the same tokens
	 * ToolCall, ToolTimeline, AgentPlan, SubagentList, CodeDiff, ApprovalCard,
	 * AiDataTable, TerminalBlock, ContextRing, RecommendationCard and Toast all
	 * read. Reusing them (fallback hues included, not a mockup's) means a copy
	 * outcome sitting next to a tool-call or a toast on the same page reads as
	 * one palette, and retinting a token once moves every success — or every
	 * failure — surface in the library together, this one included. The error
	 * fallback pair is Toast's, character for character, so the two failure
	 * surfaces stay one colour even in a theme that declares neither token.
	 *
	 * `:global()` is required, not stylistic: the classes below land on the
	 * `<button>`/`<a>` that Button.svelte renders inside its own template, which
	 * is outside this component's scoped tree, so a normal scoped selector would
	 * never match it.
	 *
	 * Unlayered author CSS beats Tailwind's `@layer utilities` regardless of
	 * selector order or the `:hover` state Button's own variant classes add, so
	 * neither skin needs a separate hover rule to keep it from flickering back
	 * to the idle variant's colours on pointer-over.
	 */
	:global(.ft-copybtn--copied) {
		border-color: color-mix(
			in oklab,
			var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145))) 35%,
			transparent
		);
		background-color: color-mix(
			in oklab,
			var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145))) 10%,
			transparent
		);
		color: var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)));
	}

	:global(.ft-copybtn--failed) {
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
