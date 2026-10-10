<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * The token set the DOM actually accepts for `autocomplete`, not a bare
 * string. The source imports this name from its framework's element types;
 * there is no counterpart here, so the same union is spelled out locally
 * over the DOM lib's own `AutoFill` pieces.
 */
export type FullAutoFill =
	| AutoFill
	| "bday"
	| `${OptionalPrefixToken<AutoFillAddressKind>}${"cc-additional-name"}`
	| "nickname"
	| "language"
	| "organization-title"
	| "photo"
	| "sex"
	| "url";

export interface TextareaProps {
	/** Current value; two-way through `v-model:value`. */
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
	/** Native `autocomplete` hint — the real token set the DOM accepts, not a bare string. */
	autocomplete?: FullAutoFill;
	/** Accessible name — for a control with no visible Label next to it. */
	label?: string;
	/** Visible height in text rows before anything grows it. Also the no-JS fallback height. */
	rows?: number;
	/** Native character ceiling; also the counter's denominator. */
	maxlength?: number;
	/** Renders the live "n / max" counter under the field. */
	showCount?: boolean;
	/** Grows to fit content instead of scrolling; disables manual resize. */
	autoResize?: boolean;
	/** Additional CSS classes — applied to the `<textarea>` itself, not the wrapper. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onMounted, useTemplateRef, watch } from "vue";

import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import { useFancyId } from "../../internals/use-id.js";

defineOptions({ name: "Textarea", inheritAttrs: false });

// `autocomplete` is widened to `string` for the macro, and only for the macro:
// the type `defineProps` generates multiplies every prop's union together, and
// the autofill token set — a four-figure union on its own — tips that product
// past the checker's ceiling once this component's six booleans are also in it
// ("Expression produces a union type that is too complex to represent"). The
// widening is a superset, so every token the source accepts still type-checks,
// and `TextareaProps` — the exported contract — still names the real set.
const {
	onValueChange,
	placeholder,
	disabled = false,
	readonly = false,
	required = false,
	invalid = false,
	id,
	name,
	autocomplete,
	label,
	rows = 3,
	maxlength,
	showCount = false,
	autoResize = false,
	class: className,
} = defineProps<Omit<TextareaProps, "autocomplete"> & { autocomplete?: string }>();

// The counterpart of the source's bindable `value`: writable from inside, kept
// in step with a caller driving it from outside, and free to move on its own
// when nobody is listening — so binding `v-model:value`, passing only
// `onValueChange`, or passing a plain `value` plus that callback all work off
// this one implementation.
const value = defineModel<string>("value", { default: "" });

// Undefined outside a FormField — every derived below then falls back to
// this component's own props instead of the context, so the control works
// standalone exactly as it does wrapped.
const field = useField();

const effectiveId = computed(() => field?.controlId ?? id);
const effectiveDisabled = computed(() => field?.disabled ?? disabled);
const effectiveRequired = computed(() => field?.required ?? required);
const effectiveInvalid = computed(() => field?.invalid ?? invalid);

const uid = useFancyId();
const countId = `${uid}-count`;
const count = computed(() => value.value.length);
const atLimit = computed(() => maxlength != null && count.value >= maxlength);

// The count rides along on aria-describedby instead of an aria-live
// region. A screen reader announces a field's description once, when
// focus lands on it — wiring the counter into the description reports
// the current count on focus without re-announcing it on every keystroke
// the way a polite live region would while the user is still typing. The
// visible counter span below *is* the description target, so there is no
// separate hidden node to keep in sync with it.
const describedBy = computed(
	() => [field?.describedBy, showCount ? countId : undefined].filter(Boolean).join(" ") || undefined
);

const classes = computed(() =>
	cn(
		"ft-textarea w-full rounded-[8px] border border-input bg-background px-[12px] py-[10px] text-[13px] leading-[1.5] text-foreground transition-colors",
		"placeholder:text-muted-foreground",
		"focus-visible:outline-none",
		"disabled:cursor-not-allowed disabled:opacity-50",
		autoResize ? "resize-none overflow-hidden" : "resize-y",
		effectiveInvalid.value && "border-destructive/50",
		className
	)
);

// Exactly where the source declares its bindable `ref`.
const el = useTemplateRef<HTMLTextAreaElement>("el");
defineExpose({ ref: el });

// Measured once from the mounted element: line-height/padding/border
// don't change under this component's feet, so re-reading them on every
// keystroke would force a layout for an answer already known.
let metrics: { line: number; extra: number } | null = null;

function px(input: string): number {
	const parsed = Number.parseFloat(input);
	return Number.isFinite(parsed) ? parsed : 0;
}

function measure(node: HTMLTextAreaElement): { line: number; extra: number } {
	if (metrics) return metrics;
	const style = getComputedStyle(node);
	const declared = Number.parseFloat(style.lineHeight);
	const fontSize = Number.parseFloat(style.fontSize);
	// jsdom (and a `line-height: normal` in real browsers) reports no
	// usable line-height at all — fall back to a 1.5x multiple of the
	// font size, then to a flat pixel guess if even that is unavailable.
	const line =
		Number.isFinite(declared) && declared > 0
			? declared
			: Number.isFinite(fontSize) && fontSize > 0
				? fontSize * 1.5
				: 20;
	const padding = px(style.paddingTop) + px(style.paddingBottom);
	// scrollHeight covers content and padding but never the border, which
	// a border-box height does include.
	const border =
		style.boxSizing === "border-box" ? px(style.borderTopWidth) + px(style.borderBottomWidth) : 0;
	metrics = { line, extra: padding + border };
	return metrics;
}

/**
 * Fits the box to its content, floored at `rows`.
 *
 * `height: auto` first, otherwise `scrollHeight` reports the box already
 * set rather than the text inside it, and the element could only ever
 * grow. Measures and writes within the same call, and only ever touches
 * `node.style` — never reactive state — so this can never re-trigger the
 * watcher that calls it below.
 */
function grow() {
	const node = el.value;
	if (!node) return;
	const { line, extra } = measure(node);
	node.style.height = "auto";
	const min = rows * line + extra;
	node.style.height = `${Math.max(node.scrollHeight, min)}px`;
}

function handleInput(event: Event) {
	if (effectiveDisabled.value) return;
	const next = (event.currentTarget as HTMLTextAreaElement).value;
	value.value = next;
	onValueChange?.(next);
	if (autoResize) grow();
}

// Growth also has to answer to writes that never pass through
// `handleInput` — a bound value assigned from outside, or a restored
// draft. Reads `value`, writes only `node.style.height`, so it can never
// wake itself. The first fit runs on mount, where the source's effect also
// runs for the first time; the watcher covers every change after it, post
// flush so the height lands on the already-patched element.
onMounted(() => {
	if (!autoResize) return;
	grow();
});

watch(
	() => [autoResize, value.value, rows] as const,
	() => {
		if (!autoResize) return;
		grow();
	},
	{ flush: "post" }
);
</script>

<template>
	<div class="ft-textarea-wrapper flex w-full flex-col gap-1.5">
		<textarea
			ref="el"
			:id="effectiveId"
			:placeholder="placeholder"
			:name="name"
			:autocomplete="autocomplete"
			:rows="rows"
			:maxlength="maxlength"
			:disabled="effectiveDisabled"
			:readonly="readonly"
			:required="effectiveRequired"
			:aria-invalid="effectiveInvalid ? 'true' : undefined"
			:aria-describedby="describedBy"
			:aria-label="label"
			:class="classes"
			:value="value"
			@input="handleInput"
		></textarea>
		<span
			v-if="showCount"
			:id="countId"
			class="ft-textarea-count text-muted-foreground self-end text-[11px]"
			:data-limit-reached="atLimit ? 'true' : undefined"
			>{{ count }}{{ maxlength != null ? ` / ${maxlength}` : "" }}</span
		>
	</div>
</template>

<style scoped>
/*
 * The brand accent has no semantic token, so it is declared locally with a
 * light-dark() fallback — the same shape Toggle, Button and Input use for
 * their own accent ring.
 */
.ft-textarea:focus-visible {
	--ft-textarea-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
	border-color: var(--ft-textarea-accent);
	box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-textarea-accent) 25%, transparent);
}

/* Reaching the character limit needs a cue that survives without colour:
   weight carries it here, so a colour-blind or monochrome-display reader
   still sees the counter's state change, not just its digits. */
.ft-textarea-count[data-limit-reached="true"] {
	font-weight: 600;
}
</style>
