<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * FormField wraps a single control with a label, help/error text and the id
 * plumbing the field context publishes — see `internals/field.ts` for the
 * FieldContext contract every control in this wave reads through
 * `useField()`.
 */
export interface FormFieldProps {
	/**
	 * Label text — the common case. For label content beyond plain text,
	 * render a `Label` yourself as part of the default slot instead: it
	 * resolves `for` and `required` from this same FormField's context on its
	 * own, so there is nothing extra to wire.
	 */
	label?: string;
	/** Help text under the control, replaced by `error` while the field is invalid. */
	description?: string;
	/** Error text. Setting it marks the field invalid and replaces the help text. */
	error?: string;
	/**
	 * Marks the field as passing validation — a decorative checkmark next to
	 * the help text, plus `valid` on the field context for a control to draw
	 * its own success look. `error` always wins if both are set. See the
	 * README for why this stays decorative rather than growing its own
	 * message the way `error` does.
	 */
	valid?: boolean;
	/** Marks the field required: the label gets an asterisk and the control gets `aria-required`. */
	required?: boolean;
	/** Disables the field: reaches the wrapped control through context. */
	disabled?: boolean;
	/** Opts out of the generated id. */
	id?: string;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, provide, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { FIELD_KEY, createFieldState } from "../../internals/field.js";
import { useFancyId } from "../../internals/use-id.js";
import { runTransition, type TransitionRun } from "../../internals/motion/animate.js";
import { preset } from "../../internals/motion/transitions.js";
import { prefersReducedMotion } from "../../internals/motion/anchored.js";
import { DURATIONS } from "../../internals/motion/tokens.js";
import Label from "../label/Label.vue";

defineOptions({ name: "FormField", inheritAttrs: false });

const {
	label,
	description,
	error,
	valid = false,
	required = false,
	disabled = false,
	id,
	class: className,
} = defineProps<FormFieldProps>();

// The source's `children` snippet: the control this field wraps.
defineSlots<{ default?: () => unknown }>();

// Convention C-4: exactly where the source declares its bindable `ref`.
const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

// Both message paragraphs and the valid glyph arrive the same way: a small
// grow-and-fade, so a message that appears under a field the user is
// typing in reads as "this just changed" instead of as a layout jolt.
//
// An ENTRANCE only, never a two-way transition. The error and the
// description are the two branches of ONE `v-if`, and each carries the id
// that `aria-describedby` points at — an exit would leave a paragraph on
// screen for 150ms after the control had already stopped describing it,
// which is an accessibility hazard rather than a nicety. With entrances
// only, the outgoing branch is gone in the same tick the incoming one
// mounts, so the id wiring and the pixels never disagree: the leave hooks
// below remove their node synchronously, exactly as an untransitioned
// `v-if` would.
//
// `prefersReducedMotion()` is called from each enter hook rather than
// stored here: the preference is read at the instant the transition starts,
// never at construction and never during SSR. `duration: 0` makes
// `runTransition` finish synchronously and never touch `element.animate()`.
//
// Module scope, not per instance: `preset()` is a pure factory returning a
// pure function, so one instance serves every field.
const pop = preset("scale");

const uid = useFancyId();
// A single per-instance seed, suffixed for the control and both message
// ids — a page with ten fields has no collisions, from a single generator
// call. `useFancyId()` (Vue's `useId()`) is the counterpart of the source's
// `$props.id()`: one seed, N collision-free suffixes across a page,
// identical in the server HTML and in the hydration render. `uid()` is
// deliberately NOT used — it throws outside the browser by design, and a
// FormField that only renders once JS has hydrated is not on the table for
// a form primitive.
//
// `base` is that seed, or the caller's own `id` when given — either way,
// every id this field hands out is a suffix of the same value, so a caller
// who supplies `id="email"` can predict `email-description` and
// `email-error` too. That matters beyond tidiness: a control that isn't
// context-aware still has a documented, stable way to wire itself up by
// hand.
const base = computed(() => id ?? uid);
const controlId = computed(() => id ?? `${uid}-control`);
const descriptionId = computed(() => `${base.value}-description`);
const errorId = computed(() => `${base.value}-error`);
// Undefined, not a generated id with nothing pointing at it, while no
// label is rendered — labelId exists specifically so a control's
// aria-labelledby never targets an id with no element behind it, the
// same rule describedBy already follows for help/error.
const labelId = computed(() => (label ? `${base.value}-label` : undefined));

const hasError = computed(() => !!error);
// Error replaces help text rather than stacking under it — the mockup
// never shows both at once, and stale help sitting under a live error
// would just be noise competing with the message that actually matters.
const hasDescription = computed(() => !hasError.value && !!description);
// `createFieldState` itself also enforces "error wins" on `field.valid` —
// this local copy only needs to gate FormField's own decorative glyph
// below, but is derived the same way so the two never disagree.
const showValid = computed(() => valid && !hasError.value);

const field = createFieldState({
	controlId: () => controlId.value,
	labelId: () => labelId.value,
	descriptionId: () => descriptionId.value,
	errorId: () => errorId.value,
	hasDescription: () => hasDescription.value,
	hasError: () => hasError.value,
	valid: () => valid,
	required: () => required,
	disabled: () => disabled,
});
provide(FIELD_KEY, field);

let messageRun: TransitionRun | undefined;
let glyphRun: TransitionRun | undefined;

function handleMessageEnter(element: Element, done: () => void): void {
	messageRun?.abort();
	messageRun = runTransition(
		element,
		pop(element, { duration: prefersReducedMotion() ? 0 : DURATIONS.fast }, {
			direction: "in",
		}),
		1,
		undefined,
		() => {
			// On enter finish, abort: that drops the `fill: forwards` so the
			// paragraph falls back to its resting style instead of carrying a
			// finished animation — whose output outranks author CSS — for the
			// rest of its life.
			messageRun?.abort();
			messageRun = undefined;
			done();
		}
	);
}

// Removal is synchronous: `done()` is called in the same tick, so the
// outgoing paragraph and the id `aria-describedby` no longer points at
// leave together. A leg still in flight is cancelled rather than left
// running against a detached node.
function handleMessageLeave(_element: Element, done: () => void): void {
	messageRun?.abort();
	messageRun = undefined;
	done();
}

// A glyph-scale beat, not a message-scale one: it is one character wide, so
// it gets `micro` (80ms) rather than the paragraph's 150ms. It also only
// animates when `valid` flips while the help text is ALREADY on screen —
// mounted together with its paragraph, this `<Transition>` is itself
// mounting for the first time and runs no enter leg, which is exactly right
// for a field that renders already-valid.
function handleGlyphEnter(element: Element, done: () => void): void {
	glyphRun?.abort();
	glyphRun = runTransition(
		element,
		pop(element, { duration: prefersReducedMotion() ? 0 : DURATIONS.micro }, {
			direction: "in",
		}),
		1,
		undefined,
		() => {
			glyphRun?.abort();
			glyphRun = undefined;
			done();
		}
	);
}

function handleGlyphLeave(_element: Element, done: () => void): void {
	glyphRun?.abort();
	glyphRun = undefined;
	done();
}

onBeforeUnmount(() => {
	messageRun?.abort();
	messageRun = undefined;
	glyphRun?.abort();
	glyphRun = undefined;
});

const classes = computed(() => cn("ft-form-field flex flex-col gap-1.5", className));
</script>

<template>
	<div ref="el" :class="classes">
		<!-- No for/required passed explicitly: Label reads both straight off
		     this same context, which is the entire point of publishing it. -->
		<Label v-if="label">{{ label }}</Label>

		<slot />

		<!-- The two branches need no hand-written `key`: the compiler keys
		     `v-if`/`v-else-if` branches apart on its own, so a swap replaces
		     the paragraph rather than mutating one in place — the outgoing
		     message and its id leave together, in the same tick the incoming
		     one lands. -->
		<Transition :css="false" @enter="handleMessageEnter" @leave="handleMessageLeave">
			<p
				v-if="hasError"
				:id="errorId"
				class="ft-form-field-message text-destructive flex items-center gap-1.5 text-[12px]"
			>
				<span aria-hidden="true">✕</span>
				{{ error }}
			</p>
			<p
				v-else-if="hasDescription"
				:id="descriptionId"
				class="ft-form-field-message text-muted-foreground flex items-center gap-1.5 text-[12px]"
			>
				<!-- Decorative reinforcement of the help text next to it, not a
				     replacement for it — see the README for why this doesn't grow
				     its own message the way the error state does. -->
				<Transition :css="false" @enter="handleGlyphEnter" @leave="handleGlyphLeave">
					<span v-if="showValid" aria-hidden="true" class="ft-form-field-valid-glyph">✓</span>
				</Transition>
				{{ description }}
			</p>
		</Transition>
	</div>
</template>

<style scoped>
/*
 * `--ft-status-done` is the family's "operation landed"/success vocabulary
 * — the same token CopyButton, ToolCall, AgentPlan, ContextRing and others
 * read. Reusing it (fallback hue included, not a fresh literal) means a
 * validated field sitting near any of those on the same page reads as one
 * palette, and retinting the token once moves every success surface in
 * the library together, this one included.
 */
.ft-form-field-valid-glyph {
	color: var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)));
}
</style>
