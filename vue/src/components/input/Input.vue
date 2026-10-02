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

export interface InputProps {
	/** Current value; two-way through `v-model:value`. */
	value?: string;
	/** Called with the new value on every input event. */
	onValueChange?: (value: string) => void;
	/** Native input type. */
	type?: "text" | "email" | "url" | "tel" | "password" | "search" | "number";
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
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";

import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";

defineOptions({ name: "Input", inheritAttrs: false });

/**
 * What the props macro is instantiated over: `InputProps` with `autocomplete`
 * widened to a plain string.
 *
 * `InputProps` itself keeps the DOM's own token union — it is the documented
 * contract and what a caller annotates against. But building a props type over
 * that union (which any reactive destructure, any `withDefaults`, and the
 * macro's own read path do) blows past what the checker will represent, and the
 * whole file then fails to check. Widening the one prop the macro sees costs a
 * call-site autocomplete check and nothing at runtime.
 */
type InputPropsInternal = Omit<InputProps, "autocomplete"> & { autocomplete?: string };

// A bare `defineProps`, with the source's defaults spelled out at the places
// they are read, rather than a reactive destructure or `withDefaults` — see
// above for why neither of those can be used here.
const props = defineProps<InputPropsInternal>();

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

const effectiveType = computed(() => props.type ?? "text");

const effectiveId = computed(() => field?.controlId ?? props.id);
const effectiveDisabled = computed(() => field?.disabled ?? props.disabled ?? false);
const effectiveRequired = computed(() => field?.required ?? props.required ?? false);
const effectiveInvalid = computed(() => field?.invalid ?? props.invalid ?? false);

// Exactly where the source declares its bindable `ref`.
const el = useTemplateRef<HTMLInputElement>("el");
defineExpose({ ref: el });

const classes = computed(() =>
	cn(
		"ft-input w-full rounded-[8px] border border-input bg-background px-[12px] py-[9px] text-[13px] text-foreground transition-colors",
		"placeholder:text-muted-foreground",
		"focus-visible:outline-none",
		"disabled:cursor-not-allowed disabled:opacity-50",
		effectiveInvalid.value && "border-destructive/50",
		props.class
	)
);

// The single place `value` changes. A native `disabled` input never fires
// `input` from real typing, but a synthetic dispatch walks straight past
// that guard the same way a synthetic click does on a button — so the
// early return is repeated here rather than trusted to the attribute alone.
function handleInput(event: Event) {
	if (effectiveDisabled.value) return;
	const next = (event.currentTarget as HTMLInputElement).value;
	value.value = next;
	props.onValueChange?.(next);
}
</script>

<template>
	<input
		ref="el"
		:type="effectiveType"
		:placeholder="props.placeholder"
		:name="props.name"
		:autocomplete="props.autocomplete"
		:id="effectiveId"
		:value="value"
		:disabled="effectiveDisabled"
		:readonly="props.readonly ?? false"
		:required="effectiveRequired"
		:aria-invalid="effectiveInvalid ? 'true' : undefined"
		:aria-describedby="field?.describedBy"
		:aria-label="props.label"
		:class="classes"
		@input="handleInput"
	/>
</template>

<style scoped>
/*
 * The brand accent has no semantic token, so it is declared locally with a
 * light-dark() fallback — the same shape Toggle and Button use for their
 * own accent ring. The 3px halo is the mockup's focus state exactly;
 * the resting/error/disabled looks are plain utility classes above.
 */
.ft-input:focus-visible {
	--ft-input-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
	border-color: var(--ft-input-accent);
	box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-input-accent) 25%, transparent);
}
</style>
