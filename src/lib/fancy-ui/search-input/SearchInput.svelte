<script lang="ts" module>
	export interface SearchInputProps {
		/** Current value; bindable. */
		value?: string;
		/** Called with the new value on every input event. */
		onValueChange?: (value: string) => void;
		/**
		 * Fired on Enter, and again on debounced settle whenever `debounceMs` is
		 * set — Enter itself always cancels a pending debounce first, so a
		 * settle never fires a second time for the value Enter already reported.
		 */
		onSearch?: (value: string) => void;
		/** Shown while the field is empty. */
		placeholder?: string;
		/**
		 * Delay, in milliseconds, before a settled value fires `onSearch` on its
		 * own. `0` (the default) disables debouncing entirely — no timer is ever
		 * scheduled, and `onSearch` only fires from Enter.
		 */
		debounceMs?: number;
		/** Blocks focus and typing; excluded from form submission. Overridden by a surrounding FormField. */
		disabled?: boolean;
		/** Blocks typing and clearing but stays focusable and is still submitted, unlike `disabled`. */
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
		/** Renders a clear button once there is something to clear. Defaults to `true`. */
		clearable?: boolean;
		/** Additional CSS classes, merged onto the root field surface (not the bare `<input>`). */
		class?: string;
		/** Element reference. */
		ref?: HTMLInputElement | null;
		/**
		 * Plays the matching interface cue through the sound controller. Off by
		 * default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { getField } from "../_internals/field.svelte.js";
	import { preset } from "../_internals/motion/transitions.js";
	import { prefersReducedMotion } from "../_internals/motion/anchored.js";
	import { DURATIONS } from "../_internals/motion/tokens.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";

	// The clear button appears mid-interaction, the instant the field stops
	// being empty — a 150ms grow-and-fade is what stops it materialising as a
	// hard pop next to the caret the user is watching.
	//
	// `in:` and never `transition:`, deliberately: `clearValue()` calls
	// `ref?.focus()` synchronously right after emptying the field, and the
	// button's own `{#if}` goes false in the same update. An outro would keep
	// the button mounted past that focus call, reordering focus against
	// `onValueChange` for anything listening. The exit is left for a later
	// pass that can move the focus handoff first.
	//
	// `prefersReducedMotion()` is called from the params expression at the
	// call site rather than stored here, because Svelte re-evaluates a
	// directive's params on every invocation: the preference is read at the
	// instant the transition starts, never at construction and never during
	// SSR. `duration: 0` makes Svelte skip `element.animate()` outright
	// instead of running a zero-length animation.
	const pop = preset("scale");

	let {
		value = $bindable(""),
		onValueChange,
		onSearch,
		placeholder = "Search",
		debounceMs = 0,
		disabled = false,
		readonly = false,
		required = false,
		invalid = false,
		id,
		name,
		label,
		clearable = true,
		class: className,
		ref = $bindable(null),
		sound = false,
	}: SearchInputProps = $props();

	// Undefined outside a FormField — every derived below then falls back to
	// this component's own props instead of the context, so the control works
	// standalone exactly as it does wrapped.
	const field = getField();

	const effectiveId = $derived(field?.controlId ?? id);
	const effectiveDisabled = $derived(field?.disabled ?? disabled);
	const effectiveRequired = $derived(field?.required ?? required);
	const effectiveInvalid = $derived(field?.invalid ?? invalid);

	// Whether the clear affordance — the button and Escape's clear-on-press —
	// is available at all right now. Kept as one derived so the button's
	// presence and Escape's behaviour never disagree about when clearing is
	// actually possible.
	const canClear = $derived(clearable && !effectiveDisabled && !readonly && value !== "");

	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	function clearDebounce() {
		if (debounceTimer !== undefined) {
			clearTimeout(debounceTimer);
			debounceTimer = undefined;
		}
	}

	// Reads nothing reactive, so this runs once at mount and its cleanup is
	// exactly the unmount teardown — the same shape CopyButton uses for its
	// own timer. A pending debounce must never fire onSearch after the
	// component backing it is gone.
	$effect(() => {
		return () => clearDebounce();
	});

	const classes = $derived(
		cn(
			"ft-search-input flex w-full items-center gap-2 rounded-full border border-input bg-background px-[14px] py-[9px] text-[13px] transition-colors",
			effectiveDisabled && "cursor-not-allowed opacity-50",
			effectiveInvalid && "border-destructive/50",
			className
		)
	);

	// The single place `value` changes from typing. A native `disabled` input
	// never fires `input` from real typing, but a synthetic dispatch walks
	// straight past that guard the same way a synthetic click does on a
	// button, so the early return is repeated here rather than trusted to the
	// attribute alone.
	function handleInput(event: Event & { currentTarget: HTMLInputElement }) {
		if (effectiveDisabled) return;
		const next = event.currentTarget.value;
		value = next;
		onValueChange?.(next);

		clearDebounce();
		if (debounceMs > 0) {
			debounceTimer = setTimeout(() => {
				debounceTimer = undefined;
				onSearch?.(next);
			}, debounceMs);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (effectiveDisabled) return;

		if (event.key === "Enter") {
			// Enter always wins over a debounce still in flight — without this,
			// a settle firing moments later would report the same value onSearch
			// was just handed, a second time.
			clearDebounce();
			onSearch?.(value);
			return;
		}

		// Escape-clears-a-search-field is the platform convention, but only
		// while there is something to clear — `canClear` is the same flag the
		// button's own presence is gated on, so the two never disagree about
		// when Escape does something. `stopPropagation` runs only in that same
		// case: this component has no dismissable layer of its own, but an
		// ancestor might (a popover or dialog this input sits inside), and its
		// Escape-to-close listener is registered on `document` — stopping the
		// bubble here is what keeps that ancestor closed only once this field
		// has nothing left of its own to clear.
		if (event.key === "Escape" && canClear) {
			event.stopPropagation();
			clearValue();
		}
	}

	function clearValue() {
		if (effectiveDisabled || readonly) return;
		value = "";
		if (sound) soundFx.play("press");
		onValueChange?.("");
		clearDebounce();
		// The button that triggered this is about to disappear (it only
		// renders while there's something to clear) — focus would otherwise be
		// left on a node no longer in the DOM. Escape reaching here already has
		// focus on the input, so this is a no-op in that path.
		ref?.focus();
	}
</script>

{#snippet searchIcon()}
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
		<circle cx="11" cy="11" r="8" />
		<line x1="21" y1="21" x2="16.65" y2="16.65" />
	</svg>
{/snippet}

<div class={classes}>
	<span class="ft-search-input-icon text-muted-foreground flex shrink-0 items-center">
		{@render searchIcon()}
	</span>
	<input
		bind:this={ref}
		type="search"
		{placeholder}
		{name}
		id={effectiveId}
		{value}
		disabled={effectiveDisabled}
		{readonly}
		required={effectiveRequired}
		aria-invalid={effectiveInvalid ? "true" : undefined}
		aria-describedby={field?.describedBy}
		aria-label={label}
		class="ft-search-input-field text-foreground placeholder:text-muted-foreground min-w-0 flex-1 border-0 bg-transparent p-0 outline-none disabled:cursor-not-allowed"
		oninput={handleInput}
		onkeydown={handleKeydown}
	/>
	{#if canClear}
		<button
			type="button"
			class="ft-search-input-clear text-muted-foreground hover:bg-accent hover:text-accent-foreground flex size-[18px] shrink-0 items-center justify-center rounded-full"
			aria-label="Clear search"
			onclick={clearValue}
			in:pop={{ duration: prefersReducedMotion() ? 0 : DURATIONS.fast }}
		>
			<svg
				class="size-2.5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="3"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<line x1="18" y1="6" x2="6" y2="18" />
				<line x1="6" y1="6" x2="18" y2="18" />
			</svg>
		</button>
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
	.ft-search-input:focus-within {
		--ft-field-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
		border-color: var(--ft-field-accent);
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-field-accent) 25%, transparent);
	}

	/*
	 * `type="search"` (rather than `type="text"`) is deliberate: it maps to
	 * the `searchbox` accessibility role instead of a plain textbox, and on a
	 * mobile keyboard it labels the return key "search" — both real wins Enter
	 * already acts on via `onSearch`. The cost is that some browsers (Chrome,
	 * Safari, Edge) draw their own native clear "x" once the field has text,
	 * which would sit right next to this component's own clear button. It is
	 * suppressed here rather than switching to `type="text"`, so there is
	 * exactly one clear affordance, not two.
	 */
	.ft-search-input-field::-webkit-search-cancel-button,
	.ft-search-input-field::-webkit-search-decoration {
		-webkit-appearance: none;
		appearance: none;
	}
</style>
