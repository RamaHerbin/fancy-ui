<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface CheckboxProps {
		/**
		 * Whether the box is checked; bindable. This is the real state
		 * underneath even while `indeterminate` is true — a click always
		 * resolves to this value, never to a third state.
		 */
		checked?: boolean;
		/**
		 * Mixed/dash visual state; bindable. A DOM property with no HTML
		 * attribute equivalent, so it is assigned straight to the element and
		 * reapplied whenever this prop changes, not only on mount. Any
		 * interaction that changes `checked` clears it back to `false`.
		 */
		indeterminate?: boolean;
		/** Called with the new checked value whenever the box is activated. */
		onCheckedChange?: (checked: boolean) => void;
		/** Blocks interaction; excluded from form submission. Overridden by a surrounding FormField. */
		disabled?: boolean;
		/** Native `required`. Overridden by a surrounding FormField. */
		required?: boolean;
		/** Drives the error border and `aria-invalid`. Overridden by a surrounding FormField. */
		invalid?: boolean;
		/** Element id. Overridden by a surrounding FormField's own `controlId`. */
		id?: string;
		/** Native `name`, read on form submission. */
		name?: string;
		/** Form value submitted while checked. */
		value?: string;
		/**
		 * Accessible name, rendered as `aria-label`. Typically for a control
		 * with no visible `children` text; also applies alongside `children`
		 * that render no text of their own (e.g. an icon), since the two props
		 * aren't mutually exclusive and there is no way to detect from here
		 * whether an arbitrary `Snippet` renders text. Skip this when
		 * `children` already supplies the visible label text — passing both
		 * means `aria-label` wins the accessible name and the visible text is
		 * announced by nothing.
		 */
		label?: string;
		/** Visible label text, rendered beside the box. */
		children?: Snippet;
		/** Additional CSS classes, merged onto the wrapping `<label>`. */
		class?: string;
		/**
		 * Plays the matching interface cue through the sound controller. Off
		 * by default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
		/** Element reference to the native `<input>`. */
		ref?: HTMLInputElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { getField } from "../_internals/field.svelte.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";

	let {
		checked = $bindable(false),
		indeterminate = $bindable(false),
		onCheckedChange,
		disabled = false,
		required = false,
		invalid = false,
		id,
		name,
		value,
		label,
		children,
		class: className,
		sound = false,
		ref = $bindable(null),
	}: CheckboxProps = $props();

	// Undefined outside a FormField — every derived below then falls back to
	// this component's own props instead of the context, so the control works
	// standalone exactly as it does wrapped.
	const field = getField();

	const effectiveId = $derived(field?.controlId ?? id);
	const effectiveDisabled = $derived(field?.disabled ?? disabled);
	const effectiveRequired = $derived(field?.required ?? required);
	const effectiveInvalid = $derived(field?.invalid ?? invalid);

	// No HTML attribute reflects `indeterminate` — it exists only as a DOM
	// property — so it has to be assigned imperatively. Re-running on every
	// change (not just on mount) is what keeps a later prop update in sync;
	// reading `ref` here rather than caching the element once also covers the
	// element being (re)bound.
	$effect(() => {
		if (ref) ref.indeterminate = indeterminate;
	});

	// The native `disabled` attribute already blocks real interaction, but a
	// synthetic event dispatched straight at the element — as a test does —
	// walks past that guard, so the handler repeats it. Reading the DOM's own
	// post-toggle `checked` (rather than computing `!checked` ourselves)
	// trusts the browser's native activation behaviour for a checkbox, which
	// already resolves an indeterminate box to a real boolean on interaction;
	// `indeterminate` is still cleared explicitly below so the prop mirrors
	// that outcome regardless of how faithfully a given environment applies it.
	function handleChange(event: Event & { currentTarget: HTMLInputElement }) {
		if (effectiveDisabled) {
			// A disabled control must never let its visible state drift from the
			// app's own model. A real browser already refuses to run the
			// default toggle action on a disabled checkbox, but a synthetic
			// event dispatched straight at the element — as a test does — can
			// still mutate the DOM property directly, so the handler puts it
			// back rather than trusting the guard above alone.
			event.currentTarget.checked = checked;
			return;
		}
		const next = event.currentTarget.checked;
		checked = next;
		indeterminate = false;
		if (sound) soundFx.play(next ? "toggle-on" : "toggle-off");
		onCheckedChange?.(next);
	}

	const wrapperClasses = $derived(
		cn(
			"ft-checkbox inline-flex items-center gap-[10px] text-[13px]",
			effectiveDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
			className
		)
	);
</script>

<label class={wrapperClasses}>
	<!--
		The mark is a SIBLING overlaid on the input, not a child of it: the
		control is a real `<input type="checkbox">`, and an `<input>` is a void
		element that cannot contain an SVG. This `<span>` is the only box the
		markup gains — the positioning context the overlay needs. Clicking the
		mark still toggles, both because it sits inside the `<label>` and
		because `pointer-events: none` hands the event straight to the input
		underneath.
	-->
	<span class="ft-checkbox-box">
		<input
			bind:this={ref}
			type="checkbox"
			class="ft-checkbox-control border-input"
			id={effectiveId}
			{name}
			{value}
			{checked}
			disabled={effectiveDisabled}
			required={effectiveRequired}
			aria-checked={indeterminate ? "mixed" : checked}
			aria-invalid={effectiveInvalid ? "true" : undefined}
			aria-describedby={field?.describedBy}
			aria-label={label}
			data-invalid={effectiveInvalid ? "true" : undefined}
			onchange={handleChange}
		/>
		<!--
			`focusable="false"` alongside `aria-hidden`: older engines put SVG
			elements in the tab order on their own, and a decorative mark that
			can be tabbed to is a keyboard trap between the box and whatever
			follows it.
		-->
		<svg class="ft-checkbox-mark" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
			<path
				class="ft-checkbox-mark-check"
				d="M4 9.2 7.2 12.4 14 5.6"
				pathLength="1"
				vector-effect="non-scaling-stroke"
			/>
			<path
				class="ft-checkbox-mark-dash"
				d="M4.5 9h9"
				pathLength="1"
				vector-effect="non-scaling-stroke"
			/>
		</svg>
	</span>
	{#if children}
		{@render children()}
	{/if}
</label>

<style>
	/* The positioning context for the mark, and nothing else — the box's own
	   geometry still lives entirely on the input below. */
	.ft-checkbox-box {
		position: relative;
		display: inline-flex;
		flex: none;
	}

	.ft-checkbox-control {
		--ft-checkbox-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
		appearance: none;
		flex: none;
		width: 18px;
		height: 18px;
		margin: 0;
		border-radius: 5px;
		border-width: 1.5px;
		cursor: pointer;
		/* Colour only, so it stays OUTSIDE the reduced-motion query on purpose:
		   a colour change is not motion, and gating it would make the fill snap
		   for exactly the users who asked for less movement. 150ms =
		   tokens.DURATIONS.fast, cubic-bezier(0.4, 0, 0.2, 1) =
		   tokens.EASINGS.inout. */
		transition:
			background-color var(--ft-duration-fast, 150ms)
				var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1)),
			border-color var(--ft-duration-fast, 150ms) var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.ft-checkbox-control:disabled {
		cursor: not-allowed;
	}

	.ft-checkbox-control:checked,
	.ft-checkbox-control:indeterminate {
		border-color: transparent;
		background-color: var(--ft-checkbox-accent);
	}

	/*
	 * The mark, overlaid on the filled box. Checked and indeterminate each get
	 * their own distinct shape (a drawn tick vs. a flat dash) rather than only
	 * a colour difference between the two — and both are real stroked paths
	 * now, which is what makes the tick draw itself instead of appearing whole.
	 */
	.ft-checkbox-mark {
		position: absolute;
		inset: 0;
		width: 18px;
		height: 18px;
		pointer-events: none;
		/* `stroke: currentColor` below plus a colour set HERE is also the whole
		   forced-colors story: in forced-colors mode the UA overrides `color`
		   and `background-color` from the same system palette, so the mark and
		   the box behind it are re-coloured together and can never disagree.
		   No `@media (forced-colors: active)` block, and nothing to keep in
		   sync with one. */
		color: white;
	}

	.ft-checkbox-mark path {
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
		/* The pathLength-normalised dash trick, the same idiom StatusMorph's
		   check and cross already use: `pathLength="1"` on the path makes the
		   dash units fractions of its own length, so a single dash exactly as
		   long as the path (dasharray 1) is hidden at dashoffset 1 and fully
		   drawn at 0. Never `getTotalLength()` — that needs layout, and this
		   needs none. */
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
	}

	/* Both paths are always present, each waiting at dashoffset 1 until its own
	   state matches. That is what makes indeterminate → checked one gesture:
	   the dash un-draws while the tick draws, over the same window, instead of
	   one shape being swapped for another. */
	.ft-checkbox-control:checked + .ft-checkbox-mark .ft-checkbox-mark-check,
	.ft-checkbox-control:indeterminate + .ft-checkbox-mark .ft-checkbox-mark-dash {
		stroke-dashoffset: 0;
	}

	/* `checked` and `indeterminate` can legitimately both be true — the prop
	   docs say so ("`checked` is the real state underneath even while
	   `indeterminate` is true"), and `aria-checked` reports "mixed" for it. The
	   two selectors above are independent, so on their own that combination
	   draws the tick and the dash superimposed: a struck-through check that
	   says neither thing. The mark has to agree with what the control already
	   announces, so the dash wins the shape. Equal specificity, later in
	   source, which is exactly enough to win — and the indeterminate → checked
	   gesture is untouched, because `handleChange` clears `indeterminate` in
	   the same tick it sets `checked`. */
	.ft-checkbox-control:indeterminate + .ft-checkbox-mark .ft-checkbox-mark-check {
		stroke-dashoffset: 1;
	}

	/*
	 * The draw is the only thing gated: the resting and drawn dashoffsets above
	 * are outside the query, so without motion the mark is simply there, whole,
	 * the instant the box is checked. It is never invisible for want of an
	 * animation.
	 *
	 * The fill runs `fast` (150ms) and the draw runs `base` (300ms), which is
	 * not one state change announcing itself twice at two speeds: the two are
	 * ordered, the box fills and then the mark is drawn onto the filled box —
	 * the same shape, and the same 300ms/--ft-ease-out clock, StatusMorph's own
	 * check already ships. One check-draw in the library, at one speed.
	 * `--ft-checkbox-draw-duration` is the one knob if a given surface wants
	 * the tick faster than the family default.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-checkbox-mark path {
			/* 300ms = tokens.DURATIONS.base, cubic-bezier(0.16, 1, 0.3, 1) = tokens.EASINGS.out */
			transition: stroke-dashoffset var(--ft-checkbox-draw-duration, var(--ft-duration-base, 300ms))
				var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
		}
	}

	.ft-checkbox-control:focus-visible {
		outline: none;
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-checkbox-accent) 25%, transparent);
	}

	/*
	 * Echoes aria-invalid on the resting border, same as Input and
	 * RadioGroupItem. On its own this would vanish exactly when the box
	 * fills in for checked/indeterminate, since the border goes transparent
	 * under the fill — the outline ring below is what survives that.
	 */
	.ft-checkbox-control[data-invalid="true"]:not(:checked):not(:indeterminate) {
		border-color: var(--color-destructive, oklch(0.63 0.24 25));
	}

	/*
	 * A ring outside the box, not a colour change to the fill or border — this
	 * is what keeps the invalid cue visible once checked or indeterminate
	 * fills the box and makes its own border transparent. It is unconditional
	 * (not scoped to :checked), so resting, checked and indeterminate all
	 * carry the same shape cue rather than only the resting look getting one.
	 * Offset past the focus-visible halo (0–3px) so the two rings never
	 * visually merge into one blurred band when both are active at once.
	 */
	.ft-checkbox-control[data-invalid="true"] {
		outline: 1.5px solid var(--color-destructive, oklch(0.63 0.24 25));
		outline-offset: 3px;
	}
</style>
