<script lang="ts" module>
	/** Result of scoring a password's strength. */
	export interface PasswordStrengthResult {
		/** 0 = very weak, 4 = strongest. The bars fill left to right by this count. */
		score: 0 | 1 | 2 | 3 | 4;
		/** Carries the actual meaning — see the component README on why colour alone never does. */
		label: string;
	}

	export interface PasswordInputProps {
		/** Current value; bindable. */
		value?: string;
		/** Called with the new value on every input event. */
		onValueChange?: (value: string) => void;
		/** Shown while the field is empty. */
		placeholder?: string;
		/** Blocks focus and typing; excluded from form submission. Overridden by a surrounding FormField. */
		disabled?: boolean;
		/** Blocks typing but stays focusable and is still submitted, unlike `disabled`. */
		readonly?: boolean;
		/** Native `required`. Overridden by a surrounding FormField. */
		required?: boolean;
		/** Drives the error border and `aria-invalid`. Overridden by a surrounding FormField. */
		invalid?: boolean;
		/** Element id. Overridden by a surrounding FormField's own `controlId`. */
		id?: string;
		/** Native `name`, read on form submission. */
		name?: string;
		/** Accessible name — for a control with no visible Label next to it. */
		label?: string;
		/** Native `autocomplete` hint. `"new-password"` opts a password manager into offering to generate one. */
		autocomplete?: "current-password" | "new-password" | "off";
		/** Renders the show/hide toggle button. Defaults to `true`. */
		showToggle?: boolean;
		/** Renders the strength meter and label once there's a value. Defaults to `false`. */
		showStrength?: boolean;
		/** Overrides the built-in heuristic scorer — see the README before trusting the default one. */
		strength?: (value: string) => PasswordStrengthResult;
		/** Additional CSS classes, merged onto the root field surface (not the bare `<input>`). */
		class?: string;
		/** Element reference. */
		ref?: HTMLInputElement | null;
	}
</script>

<script lang="ts">
	import { tick } from "svelte";
	import { cn } from "$lib/utils.js";
	import { getField } from "../_internals/field.svelte.js";
	import { preset } from "../_internals/motion/transitions.js";
	import { prefersReducedMotion } from "../_internals/motion/anchored.js";
	import { DURATIONS } from "../_internals/motion/tokens.js";

	// The reveal toggle swaps one 16px glyph for another in place. A hard cut
	// at that scale reads as a flicker, so the two icons cross-fade over
	// `micro` (80ms) — a beat that only registers as a beat.
	//
	// This is the one bidirectional `transition:` in this pass, and it earns it:
	// a cross-fade needs both layers mounted at once, which an `in:`-only
	// directive cannot give. It is safe because nothing observes the icon's
	// unmount — `aria-label` and `aria-pressed` live on the <button> and flip
	// synchronously, and both glyphs are `aria-hidden`, so a screen reader
	// never sees the overlap. The two-layer grid stack below is what keeps the
	// overlap free of layout impact.
	//
	// `prefersReducedMotion()` is called from the params expression at the call
	// site rather than stored here: Svelte re-evaluates a directive's params on
	// every invocation, so the preference is read at the instant the transition
	// starts, never at construction and never during SSR. `duration: 0` makes
	// Svelte skip `element.animate()` outright.
	const iconFade = preset("fade");

	let {
		value = $bindable(""),
		onValueChange,
		placeholder,
		disabled = false,
		readonly = false,
		required = false,
		invalid = false,
		id,
		name,
		label,
		autocomplete = "current-password",
		showToggle = true,
		showStrength = false,
		strength,
		class: className,
		ref = $bindable(null),
	}: PasswordInputProps = $props();

	// Undefined outside a FormField — every derived below then falls back to
	// this component's own props instead of the context, so the control works
	// standalone exactly as it does wrapped.
	const field = getField();

	const effectiveId = $derived(field?.controlId ?? id);
	const effectiveDisabled = $derived(field?.disabled ?? disabled);
	const effectiveRequired = $derived(field?.required ?? required);
	const effectiveInvalid = $derived(field?.invalid ?? invalid);

	let revealed = $state(false);
	const type = $derived(revealed ? "text" : "password");

	const uid = $props.id();
	const strengthId = `${uid}-strength`;

	/**
	 * Length plus character-class variety — nothing more. This is a UX
	 * heuristic for nudging a user toward a better password while they type,
	 * not a security control: it has no notion of dictionary words, leaked
	 * password lists, or keyboard-walk patterns, so a password like
	 * "Password1!" scores far better here than it should. A real deployment
	 * needs a proper strength estimator run server-side — pass `strength` to
	 * replace this scorer entirely rather than trusting it for anything that
	 * matters.
	 */
	function defaultStrength(password: string): PasswordStrengthResult {
		let classes = 0;
		if (/[a-z]/.test(password)) classes++;
		if (/[A-Z]/.test(password)) classes++;
		if (/[0-9]/.test(password)) classes++;
		if (/[^a-zA-Z0-9]/.test(password)) classes++;

		const lengthBonus = password.length >= 12 ? 2 : password.length >= 8 ? 1 : 0;
		const raw = classes + lengthBonus;
		const score = (raw <= 1 ? 0 : raw === 2 ? 1 : raw === 3 ? 2 : raw === 4 ? 3 : 4) as
			| 0
			| 1
			| 2
			| 3
			| 4;
		const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"] as const;
		return { score, label: labels[score] };
	}

	const scoreFn = $derived(strength ?? defaultStrength);
	// No result at all while the field is empty — an unfilled meter under an
	// empty field would be noise, not a signal, and there is nothing yet to
	// describe.
	const result = $derived(showStrength && value ? scoreFn(value) : undefined);

	// The strength label rides along on aria-describedby instead of a live
	// region. A screen reader announces a field's description once, when
	// focus lands on it — wiring the label into the description reports the
	// current strength on focus without re-announcing it on every keystroke
	// the way a polite live region would while the user is still typing. The
	// visible label span below *is* the description target, so there is no
	// separate hidden node to keep in sync with it. Svelte also only touches
	// that span's text when the string actually changes, so a screen reader
	// that does treat aria-describedby text as live content still would not
	// hear it churn on every character.
	const describedBy = $derived(
		[field?.describedBy, result ? strengthId : undefined].filter(Boolean).join(" ") || undefined
	);

	const tierClass = $derived.by(() => {
		if (!result) return "";
		if (result.score <= 1) return "bg-destructive";
		if (result.score === 2) return "bg-muted-foreground";
		return "ft-password-strength-bar--strong";
	});

	const wrapperClasses = $derived(
		cn(
			"ft-password-input flex w-full items-center gap-2 rounded-[8px] border border-input bg-background px-[12px] py-[9px] text-[13px] transition-colors",
			effectiveDisabled && "cursor-not-allowed opacity-50",
			effectiveInvalid && "border-destructive/50",
			className
		)
	);

	// The single place `value` changes. A native `disabled` input never fires
	// `input` from real typing, but a synthetic dispatch walks straight past
	// that guard the same way a synthetic click does on a button, so the
	// early return is repeated here rather than trusted to the attribute alone.
	function handleInput(event: Event & { currentTarget: HTMLInputElement }) {
		if (effectiveDisabled) return;
		const next = event.currentTarget.value;
		value = next;
		onValueChange?.(next);
	}

	// Swapping `type` between "password" and "text" resets selection in some
	// browsers even though it's the same element and the same characters —
	// the caret (or a real selection) is captured here and restored once the
	// new `type` has actually reached the DOM. `tick()` is what makes "actually
	// reached the DOM" true: the `type` attribute is driven by the `revealed`
	// state below, and that write is batched like any other `$state` write —
	// reading `el.selectionStart` right after flipping `revealed` would still
	// see the old `type`.
	async function toggleReveal() {
		if (effectiveDisabled) return;
		const el = ref;
		const start = el?.selectionStart ?? null;
		const end = el?.selectionEnd ?? null;
		const direction = el?.selectionDirection ?? undefined;

		revealed = !revealed;
		await tick();

		if (el && start !== null && end !== null) {
			el.setSelectionRange(start, end, direction ?? undefined);
		}
	}

	// A mouse click on the toggle would otherwise move focus onto the button
	// before `toggleReveal` runs its capture step — this keeps focus (and the
	// visible caret) on the input throughout a mouse-driven toggle. Keyboard
	// activation still moves focus to the button as normal; the selection is
	// still restored on the input either way, so it's correct the moment
	// focus returns there.
	function preventFocusSteal(event: MouseEvent) {
		event.preventDefault();
	}
</script>

{#snippet eyeIcon()}
	<svg
		class="size-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
		<circle cx="12" cy="12" r="3" />
	</svg>
{/snippet}

{#snippet eyeOffIcon()}
	<svg
		class="size-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path
			d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a17.6 17.6 0 0 1-2.16 3.19m-3.22 2.62A9.2 9.2 0 0 1 12 20c-7 0-11-8-11-8a17.7 17.7 0 0 1 4.09-5.41"
		/>
		<path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
		<line x1="1" y1="1" x2="23" y2="23" />
	</svg>
{/snippet}

<div class="ft-password-input-wrapper flex w-full flex-col gap-1.5">
	<div class={wrapperClasses}>
		<input
			bind:this={ref}
			{type}
			{placeholder}
			{name}
			{autocomplete}
			id={effectiveId}
			{value}
			disabled={effectiveDisabled}
			{readonly}
			required={effectiveRequired}
			aria-invalid={effectiveInvalid ? "true" : undefined}
			aria-describedby={describedBy}
			aria-label={label}
			class="ft-password-input-field text-foreground placeholder:text-muted-foreground min-w-0 flex-1 border-0 bg-transparent p-0 outline-none disabled:cursor-not-allowed"
			oninput={handleInput}
		/>
		{#if showToggle}
			<button
				type="button"
				class="ft-password-input-toggle text-muted-foreground hover:text-foreground flex shrink-0 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
				disabled={effectiveDisabled}
				aria-pressed={revealed}
				aria-label={revealed ? "Hide password" : "Show password"}
				onmousedown={preventFocusSteal}
				onclick={toggleReveal}
			>
				<span class="ft-password-input-eye">
					{#if revealed}
						<span
							class="ft-password-input-eye-layer"
							transition:iconFade={{ duration: prefersReducedMotion() ? 0 : DURATIONS.micro }}
						>
							{@render eyeOffIcon()}
						</span>
					{:else}
						<span
							class="ft-password-input-eye-layer"
							transition:iconFade={{ duration: prefersReducedMotion() ? 0 : DURATIONS.micro }}
						>
							{@render eyeIcon()}
						</span>
					{/if}
				</span>
			</button>
		{/if}
	</div>
	{#if result}
		<div class="ft-password-strength flex flex-col gap-1">
			<!-- `ft-password-strength-bar` is a styling hook, not a state class:
			     every segment carries it at every tier, so the colour transition
			     below has one selector to attach to instead of four. -->
			<div class="flex gap-1" aria-hidden="true">
				<span
					class={cn(
						"ft-password-strength-bar h-1 flex-1 rounded-full",
						result.score >= 1 ? tierClass : "bg-border"
					)}
				></span>
				<span
					class={cn(
						"ft-password-strength-bar h-1 flex-1 rounded-full",
						result.score >= 2 ? tierClass : "bg-border"
					)}
				></span>
				<span
					class={cn(
						"ft-password-strength-bar h-1 flex-1 rounded-full",
						result.score >= 3 ? tierClass : "bg-border"
					)}
				></span>
				<span
					class={cn(
						"ft-password-strength-bar h-1 flex-1 rounded-full",
						result.score >= 4 ? tierClass : "bg-border"
					)}
				></span>
			</div>
			<span id={strengthId} class="text-[11px]">
				{result.label}
			</span>
		</div>
	{/if}
</div>

<style>
	/*
	 * The brand accent has no semantic token, so it is declared locally with a
	 * light-dark() fallback — the same shape Input and Textarea use for their
	 * own accent ring. The ring lives on the wrapper via :focus-within rather
	 * than on the bare input, because the input itself has no border or
	 * background of its own here — the wrapper is the visual field surface.
	 */
	.ft-password-input:focus-within {
		--ft-field-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
		border-color: var(--ft-field-accent);
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-field-accent) 25%, transparent);
	}

	/*
	 * `--ft-status-done` is the family's "operation landed"/success
	 * vocabulary — the same token FormField, CopyButton, ToolCall and others
	 * read for their own success state. Reusing it here (fallback hue
	 * included, not a fresh literal) means a strong-password cue sitting near
	 * any of those on the same page reads as one palette.
	 */
	.ft-password-strength-bar--strong {
		background: var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)));
	}

	/*
	 * Deliberately NOT inside `@media (prefers-reduced-motion: no-preference)`:
	 * a colour change is not motion, nothing here travels or scales, and gating
	 * it would make a tier change snap for exactly the users who asked for a
	 * calmer interface. The meter is the one part of this component that
	 * restates itself on every keystroke, so easing the colour is what keeps a
	 * password crossing a tier boundary from reading as a flash.
	 *
	 * `background-color`, not `width` or `scaleX`: the bars are a four-segment
	 * meter, and growing them would read as a progress bar filling rather than
	 * a tier changing.
	 *
	 * 150ms = tokens.DURATIONS.fast, cubic-bezier(0.4, 0, 0.2, 1) =
	 * tokens.EASINGS.inout — a reversible state flip, since a tier can go back
	 * down as easily as up.
	 */
	.ft-password-strength-bar {
		transition: background-color
			var(--ft-password-strength-duration, var(--ft-duration-fast, 150ms))
			var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1));
	}

	/*
	 * The reveal toggle's two icon layers share one grid cell, so both can be
	 * mounted during the cross-fade without either one moving the other or
	 * changing the button's width mid-swap. `grid-area: 1 / 1` is what makes
	 * the overlap free: the wrapper sizes to the larger of the two glyphs (they
	 * are the same 16px box) and stays that size whether one layer is mounted
	 * or two.
	 */
	.ft-password-input-eye {
		display: grid;
	}

	.ft-password-input-eye-layer {
		grid-area: 1 / 1;
		display: inline-flex;
	}
</style>
