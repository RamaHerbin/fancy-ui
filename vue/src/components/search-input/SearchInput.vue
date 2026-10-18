<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface SearchInputProps {
	/** Current value; two-way through `v-model:value`. */
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
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import { preset } from "../../internals/motion/transitions.js";
import { prefersReducedMotion } from "../../internals/motion/anchored.js";
import { DURATIONS } from "../../internals/motion/tokens.js";
import { runTransition } from "../../internals/motion/animate.js";
import { sound as soundFx } from "../../sound/sound.js";

defineOptions({ name: "SearchInput", inheritAttrs: false });

// The clear button appears mid-interaction, the instant the field stops
// being empty — a 150ms grow-and-fade is what stops it materialising as a
// hard pop next to the caret the user is watching.
//
// Intro-only, deliberately: `clearValue()` calls `inputEl.value?.focus()`
// synchronously right after emptying the field, and the button's own
// `v-if` goes false in the same tick. An outro would keep the button
// mounted past that focus call, reordering focus against `onValueChange`
// for anything listening. The exit is left for a later pass that can move
// the focus handoff first — so the `<Transition>` below carries only
// `@enter`, never `@leave`.
//
// `prefersReducedMotion()` is read inside `onClearEnter`, at the instant
// the transition actually starts, rather than stored here — matching the
// Svelte source, which re-evaluates it on every invocation of the
// directive's params expression, never at construction and never during
// SSR. A `duration` of `0` makes `runTransition` skip `element.animate()`
// outright instead of running a zero-length animation.
const pop = preset("scale");

const {
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
	sound = false,
} = defineProps<SearchInputProps>();

// The counterpart of the source's bindable `value`: writable from inside, kept
// in step with a caller driving it from outside, and free to move on its own
// when nobody is listening. Declared in `SearchInputProps` above and left out
// of the destructure below, exactly as the other field controls spell it.
const value = defineModel<string>("value", { default: "" });

const inputEl = useTemplateRef<HTMLInputElement>("inputEl");
defineExpose({ ref: inputEl });

// Undefined outside a FormField — every effective* below then falls back to
// this component's own props instead of the context, so the control works
// standalone exactly as it does wrapped.
const field = useField();

const effectiveId = computed(() => field?.controlId ?? id);
const effectiveDisabled = computed(() => field?.disabled ?? disabled);
const effectiveRequired = computed(() => field?.required ?? required);
const effectiveInvalid = computed(() => field?.invalid ?? invalid);

// Whether the clear affordance — the button and Escape's clear-on-press —
// is available at all right now. Kept as one computed so the button's
// presence and Escape's behaviour never disagree about when clearing is
// actually possible.
const canClear = computed(
	() => clearable && !effectiveDisabled.value && !readonly && value.value !== ""
);

let debounceTimer: ReturnType<typeof setTimeout> | undefined;

function clearDebounce() {
	if (debounceTimer !== undefined) {
		clearTimeout(debounceTimer);
		debounceTimer = undefined;
	}
}

// Reads nothing reactive, so this runs once at mount and its cleanup is
// exactly the unmount teardown. A pending debounce must never fire
// onSearch after the component backing it is gone.
onMounted(() => {
	onBeforeUnmount(() => clearDebounce());
});

const classes = computed(() =>
	cn(
		"ft-search-input flex w-full items-center gap-2 rounded-full border border-input bg-background px-[14px] py-[9px] text-[13px] transition-colors",
		effectiveDisabled.value && "cursor-not-allowed opacity-50",
		effectiveInvalid.value && "border-destructive/50",
		className
	)
);

// The single place `value` changes from typing. A native `disabled` input
// never fires `input` from real typing, but a synthetic dispatch walks
// straight past that guard the same way a synthetic click does on a
// button, so the early return is repeated here rather than trusted to the
// attribute alone.
//
// The source types the event `Event & { currentTarget: HTMLInputElement }`;
// here the narrowing moves into the body, because a template listener is
// checked against the DOM's own `onInput` signature and an event type
// narrower than `Event` is not assignable to it — the same shape the other
// field controls use.
function handleInput(event: Event) {
	if (effectiveDisabled.value) return;
	const next = (event.currentTarget as HTMLInputElement).value;
	value.value = next;
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
	if (effectiveDisabled.value) return;

	if (event.key === "Enter") {
		// Enter always wins over a debounce still in flight — without this,
		// a settle firing moments later would report the same value onSearch
		// was just handed, a second time.
		clearDebounce();
		onSearch?.(value.value);
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
	if (event.key === "Escape" && canClear.value) {
		event.stopPropagation();
		clearValue();
	}
}

function clearValue() {
	if (effectiveDisabled.value || readonly) return;
	value.value = "";
	if (sound) soundFx.play("press");
	onValueChange?.("");
	clearDebounce();
	// The button that triggered this is about to disappear (it only
	// renders while there's something to clear) — focus would otherwise be
	// left on a node no longer in the DOM. Escape reaching here already has
	// focus on the input, so this is a no-op in that path.
	inputEl.value?.focus();
}

function onClearEnter(el: Element, done: () => void) {
	const spec = pop(
		el,
		{ duration: prefersReducedMotion() ? 0 : DURATIONS.fast },
		{ direction: "in" }
	);
	runTransition(el, spec, 1, undefined, done);
}
</script>

<template>
	<div :class="classes">
		<span class="ft-search-input-icon text-muted-foreground flex shrink-0 items-center">
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
		</span>
		<input
			ref="inputEl"
			type="search"
			:placeholder="placeholder"
			:name="name"
			:id="effectiveId"
			:value="value"
			:disabled="effectiveDisabled"
			:readonly="readonly"
			:required="effectiveRequired"
			:aria-invalid="effectiveInvalid ? 'true' : undefined"
			:aria-describedby="field?.describedBy"
			:aria-label="label"
			class="ft-search-input-field text-foreground placeholder:text-muted-foreground min-w-0 flex-1 border-0 bg-transparent p-0 outline-none disabled:cursor-not-allowed"
			@input="handleInput"
			@keydown="handleKeydown"
		/>
		<Transition :css="false" @enter="onClearEnter">
			<button
				v-if="canClear"
				type="button"
				class="ft-search-input-clear text-muted-foreground hover:bg-accent hover:text-accent-foreground flex size-[18px] shrink-0 items-center justify-center rounded-full"
				aria-label="Clear search"
				@click="clearValue"
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
		</Transition>
	</div>
</template>

<style scoped>
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
