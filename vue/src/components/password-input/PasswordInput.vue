<script lang="ts">
import type { HTMLAttributes } from "vue";

/** Result of scoring a password's strength. */
export interface PasswordStrengthResult {
	/** 0 = very weak, 4 = strongest. The bars fill left to right by this count. */
	score: 0 | 1 | 2 | 3 | 4;
	/** Carries the actual meaning — see the component README on why colour alone never does. */
	label: string;
}

export interface PasswordInputProps {
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
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import { useFancyId } from "../../internals/use-id.js";
import { usePresence } from "../../internals/motion/presence.js";
import { preset } from "../../internals/motion/transitions.js";
import { prefersReducedMotion } from "../../internals/motion/anchored.js";
import { DURATIONS } from "../../internals/motion/tokens.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { composeRefs } from "../../internals/dom/compose-refs.js";

defineOptions({ name: "PasswordInput", inheritAttrs: false });

// `value` stays out of this destructure: the model below owns it. It is still
// declared on `PasswordInputProps` because the interface is the documented
// contract a caller annotates against, exactly as Input and Textarea declare
// theirs alongside their own `defineModel`.
const {
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
	sound = false,
} = defineProps<PasswordInputProps>();

// The source's `value = $bindable("")`.
const value = defineModel<string>("value", { default: "" });

const inputRef = useTemplateRef<HTMLInputElement>("inputRef");
// Convention C-4: exactly where the source declares its bindable `ref`.
defineExpose({ ref: inputRef });

const playCue = useSoundCue(() => sound);

// The reveal toggle swaps one 16px glyph for another in place. A hard cut
// at that scale reads as a flicker, so the two icons cross-fade over
// `micro` (80ms) — a beat that only registers as a beat.
//
// This is the one bidirectional transition in this pass, and it earns it: a
// cross-fade needs both layers mounted at once, which an enter-only
// animation cannot give. It is safe because nothing observes the icon's
// unmount — `aria-label` and `aria-pressed` live on the <button> and flip
// synchronously, and both glyphs are `aria-hidden`, so a screen reader never
// sees the overlap. The two-layer grid stack below is what keeps the overlap
// free of layout impact.
//
// `prefersReducedMotion()` is called from the params factory rather than
// stored once: `usePresence` reads a factory at the instant a leg starts, so
// the preference is read when the transition begins, never at construction
// and never during SSR. `duration: 0` makes the runner skip
// `element.animate()` outright.
const iconFade = preset("fade");
const fadeParams = () => ({
	duration: prefersReducedMotion() ? 0 : DURATIONS.micro,
});

// Undefined outside a FormField — every derived below then falls back to
// this component's own props instead of the context, so the control works
// standalone exactly as it does wrapped.
const field = useField();

const effectiveId = computed(() => field?.controlId ?? id);
const effectiveDisabled = computed(() => field?.disabled ?? disabled);
const effectiveRequired = computed(() => field?.required ?? required);
const effectiveInvalid = computed(() => field?.invalid ?? invalid);

const revealed = ref(false);
const type = computed(() => (revealed.value ? "text" : "password"));

// One clock per icon layer, both fed the same bidirectional fade — during a
// toggle both layers are mounted at once and both animate, which is exactly
// what the source's paired `transition:` directives do.
const revealedIcon = usePresence(() => revealed.value);
const hiddenIcon = usePresence(() => !revealed.value);

// Built ONCE here, never in the template: `composeRefs` is the adapter that
// narrows the core's `(node: HTMLElement | null) => void` to the looser shape
// Vue hands a function `ref`, and a ref whose identity changed between patches
// would make Vue detach and reattach the node — throwing the in-flight leg of
// the cross-fade away on the very frame it starts.
const revealedIconRef = composeRefs<HTMLSpanElement>(revealedIcon.register(iconFade, fadeParams));
const hiddenIconRef = composeRefs<HTMLSpanElement>(hiddenIcon.register(iconFade, fadeParams));

const uid = useFancyId();
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

const scoreFn = computed(() => strength ?? defaultStrength);
// No result at all while the field is empty — an unfilled meter under an
// empty field would be noise, not a signal, and there is nothing yet to
// describe.
const result = computed(() =>
	showStrength && value.value ? scoreFn.value(value.value) : undefined
);

// The strength label rides along on aria-describedby instead of a live
// region. A screen reader announces a field's description once, when focus
// lands on it — wiring the label into the description reports the current
// strength on focus without re-announcing it on every keystroke the way a
// polite live region would while the user is still typing. The visible
// label span below *is* the description target, so there is no separate
// hidden node to keep in sync with it.
const describedBy = computed(
	() =>
		[field?.describedBy, result.value ? strengthId : undefined].filter(Boolean).join(" ") ||
		undefined
);

const tierClass = computed(() => {
	if (!result.value) return "";
	if (result.value.score <= 1) return "bg-destructive";
	if (result.value.score === 2) return "bg-muted-foreground";
	return "ft-password-strength-bar--strong";
});

const wrapperClasses = computed(() =>
	cn(
		"ft-password-input flex w-full items-center gap-2 rounded-[8px] border border-input bg-background px-[12px] py-[9px] text-[13px] transition-colors",
		effectiveDisabled.value && "cursor-not-allowed opacity-50",
		effectiveInvalid.value && "border-destructive/50",
		className
	)
);

// The single place `value` changes. A native `disabled` input never fires
// `input` from real typing, but a synthetic dispatch walks straight past
// that guard the same way a synthetic click does on a button, so the early
// return is repeated here rather than trusted to the attribute alone.
function handleInput(event: Event) {
	if (effectiveDisabled.value) return;
	const next = (event.target as HTMLInputElement).value;
	value.value = next;
	onValueChange?.(next);
}

// Swapping `type` between "password" and "text" resets selection in some
// browsers even though it's the same element and the same characters — the
// caret (or a real selection) is captured here and restored once the new
// `type` has actually reached the DOM. The `nextTick()` await is what makes
// "actually reached the DOM" true: the `type` attribute is driven by the
// `revealed` state below, and that write is batched like any other write —
// reading `el.selectionStart` right after flipping `revealed` would still
// see the old `type`.
async function toggleReveal() {
	if (effectiveDisabled.value) return;
	const el = inputRef.value;
	const start = el?.selectionStart ?? null;
	const end = el?.selectionEnd ?? null;
	const direction = el?.selectionDirection ?? undefined;

	revealed.value = !revealed.value;
	if (sound) playCue(revealed.value ? "toggle-on" : "toggle-off");
	await nextTick();

	if (el && start !== null && end !== null) {
		el.setSelectionRange(start, end, direction ?? undefined);
	}
}

// A mouse click on the toggle would otherwise move focus onto the button
// before `toggleReveal` runs its capture step — this keeps focus (and the
// visible caret) on the input throughout a mouse-driven toggle. Keyboard
// activation still moves focus to the button as normal; the selection is
// still restored on the input either way, so it's correct the moment focus
// returns there.
function preventFocusSteal(event: MouseEvent) {
	event.preventDefault();
}
</script>

<template>
	<div class="ft-password-input-wrapper flex w-full flex-col gap-1.5">
		<div :class="wrapperClasses">
			<input
				ref="inputRef"
				:type="type"
				:placeholder="placeholder"
				:name="name"
				:autocomplete="autocomplete"
				:id="effectiveId"
				:value="value"
				:disabled="effectiveDisabled"
				:readonly="readonly"
				:required="effectiveRequired"
				:aria-invalid="effectiveInvalid ? 'true' : undefined"
				:aria-describedby="describedBy"
				:aria-label="label"
				class="ft-password-input-field text-foreground placeholder:text-muted-foreground min-w-0 flex-1 border-0 bg-transparent p-0 outline-none disabled:cursor-not-allowed"
				@input="handleInput"
			/>
			<button
				v-if="showToggle"
				type="button"
				class="ft-password-input-toggle text-muted-foreground hover:text-foreground flex shrink-0 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
				:disabled="effectiveDisabled"
				:aria-pressed="revealed"
				:aria-label="revealed ? 'Hide password' : 'Show password'"
				@mousedown="preventFocusSteal"
				@click="toggleReveal"
			>
				<span class="ft-password-input-eye">
					<span
						v-if="revealedIcon.mounted"
						class="ft-password-input-eye-layer"
						:ref="revealedIconRef"
					>
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
					</span>
					<span
						v-if="hiddenIcon.mounted"
						class="ft-password-input-eye-layer"
						:ref="hiddenIconRef"
					>
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
					</span>
				</span>
			</button>
		</div>
		<div v-if="result" class="ft-password-strength flex flex-col gap-1">
			<!-- `ft-password-strength-bar` is a styling hook, not a state class:
			     every segment carries it at every tier, so the colour transition
			     below has one selector to attach to instead of four. -->
			<div class="flex gap-1" aria-hidden="true">
				<span
					:class="
						cn(
							'ft-password-strength-bar h-1 flex-1 rounded-full',
							result.score >= 1 ? tierClass : 'bg-border'
						)
					"
				></span>
				<span
					:class="
						cn(
							'ft-password-strength-bar h-1 flex-1 rounded-full',
							result.score >= 2 ? tierClass : 'bg-border'
						)
					"
				></span>
				<span
					:class="
						cn(
							'ft-password-strength-bar h-1 flex-1 rounded-full',
							result.score >= 3 ? tierClass : 'bg-border'
						)
					"
				></span>
				<span
					:class="
						cn(
							'ft-password-strength-bar h-1 flex-1 rounded-full',
							result.score >= 4 ? tierClass : 'bg-border'
						)
					"
				></span>
			</div>
			<span :id="strengthId" class="text-[11px]">
				{{ result.label }}
			</span>
		</div>
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
.ft-password-input:focus-within {
	--ft-field-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
	border-color: var(--ft-field-accent);
	box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-field-accent) 25%, transparent);
}

/*
 * `--ft-status-done` is the family's "operation landed"/success vocabulary
 * — the same token FormField, CopyButton, ToolCall and others read for
 * their own success state. Reusing it here (fallback hue included, not a
 * fresh literal) means a strong-password cue sitting near any of those on
 * the same page reads as one palette.
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
