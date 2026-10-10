<script lang="ts">
import type { HTMLAttributes } from "vue";

import type { AttachmentData } from "../../internals/ai-types.js";

/**
 * Props for Composer
 */
export interface ComposerProps {
	/** The draft text, two-way through `v-model:value`. Cleared by a successful submit. */
	value?: string;
	/**
	 * Files riding along with the draft, two-way through `v-model:attachments`.
	 * The consumer owns uploading them.
	 */
	attachments?: AttachmentData[];
	/** Blocks typing, sending, and attaching. */
	disabled?: boolean;
	/** A response is arriving: the send button becomes a stop button. */
	streaming?: boolean;
	/** Placeholder for the default input. Ignored once the default slot replaces the composition. */
	placeholder?: string;
	/** Called with the trimmed draft and a snapshot of the attachments. */
	onSubmit?: (payload: { text: string; attachments: AttachmentData[] }) => void;
	/** Called when the stop button is pressed while streaming. */
	onStop?: () => void;
	/** Called with the files handed to `addFiles`. Upload them, then push onto `attachments`. */
	onAttach?: (files: File[]) => void;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { nextTick, provide, shallowRef, useTemplateRef } from "vue";

import { cn } from "../../utils.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { findTokenStart } from "./caret.js";
import ComposerInput from "./ComposerInput.vue";
import ComposerSubmit from "./ComposerSubmit.vue";
import { COMPOSER_CONTEXT_KEY, type ComposerContext } from "./types.js";

defineOptions({ name: "Composer", inheritAttrs: false });

const {
	disabled = false,
	streaming = false,
	placeholder,
	onSubmit,
	onStop,
	onAttach,
	class: className,
	sound = false,
} = defineProps<ComposerProps>();

const value = defineModel<string>("value", { default: "" });
const attachments = defineModel<AttachmentData[]>("attachments", { default: () => [] });

defineSlots<{
	/** Replaces the default input-and-send-row composition entirely. */
	default?(): unknown;
	/** An overlay covering the composer — a voice panel, a drop target, a confirmation. */
	accessory?(): unknown;
}>();

const el = useTemplateRef<HTMLFormElement>("el");
defineExpose({ ref: el });

// A no-op while `sound` is false, so the call sites below stay unguarded, and
// the preference is read inside the returned function rather than in a render
// path.
const playCue = useSoundCue(() => sound);

// Written by ComposerInput through the context, read by insertText's caret
// arithmetic. A composer with no input part keeps it null and falls back to
// appending at the end of the draft.
const textareaEl = shallowRef<HTMLTextAreaElement | null>(null);

function submit() {
	// A composer that is off or already busy sends nothing, whatever the draft
	// says — the send button is disabled in both states, but Enter and a
	// programmatic `submit()` reach here too.
	if (disabled || streaming) return;
	const text = value.value.trim();
	if (text === "" && attachments.value.length === 0) return;
	// With nobody listening there is nowhere for the draft to go, and clearing
	// it would throw away text the reader has no way of getting back.
	if (!onSubmit) return;
	playCue("press");
	// A copy, so a consumer stashing the payload does not end up holding the
	// live list it is about to mutate.
	onSubmit({ text, attachments: [...attachments.value] });
	// The text is ours to clear; the attachments belong to the consumer, who
	// alone knows whether an upload is still in flight.
	value.value = "";
}

function stop() {
	if (!streaming) return;
	// No handler, no interruption — the cue must not announce a stop that
	// cannot happen (ComposerSubmit disables itself in that state too).
	if (onStop) playCue("press");
	onStop?.();
}

function setValue(next: string) {
	value.value = next;
}

function insertText(text: string, replaceTriggerToken = false) {
	// A composer that is off or already busy takes no dictation either — the
	// textarea is readonly in both states, and a menu writing through the
	// context would be the one way around that.
	if (disabled || streaming) return;
	const current = value.value;
	const rawEnd = textareaEl.value?.selectionEnd;
	const end = typeof rawEnd === "number" ? rawEnd : current.length;
	const rawStart = textareaEl.value?.selectionStart;
	const selectionStart = typeof rawStart === "number" ? Math.min(rawStart, end) : end;

	// The menus' own definition of a token, not a second one that could drift
	// from it: what a menu matched is exactly what a completion overwrites.
	const trigger = replaceTriggerToken ? findTokenStart(current, end) : -1;
	const start = trigger >= 0 ? trigger : selectionStart;
	const trailing = current.slice(end);

	// Completing a token leaves the caret ready for the next word; a plain
	// insert splices exactly what it was handed, and nothing more.
	const needsSpace = trigger >= 0 && !/\s$/.test(text) && !/^\s/.test(trailing);
	const insertion = needsSpace ? `${text} ` : text;
	const caret = start + insertion.length;

	value.value = `${current.slice(0, start)}${insertion}${trailing}`;

	const target = textareaEl.value;
	if (!target) return;
	// The caret can only be placed once the controlled value has reached the
	// DOM, so it waits a tick. Focus comes back with it: the insertion was
	// almost certainly triggered from a menu that stole it.
	void nextTick().then(() => {
		if (!target.isConnected) return;
		target.focus();
		target.setSelectionRange(caret, caret);
	});
}

function addFiles(files: File[]) {
	if (disabled || files.length === 0) return;
	onAttach?.(files);
}

function removeAttachment(id: string) {
	attachments.value = attachments.value.filter((attachment) => attachment.id !== id);
}

const context: ComposerContext = {
	value: {
		get current() {
			return value.value;
		},
	},
	attachments: {
		get current() {
			return attachments.value;
		},
	},
	get disabled() {
		return disabled;
	},
	get streaming() {
		return streaming;
	},
	get stoppable() {
		return typeof onStop === "function";
	},
	get sound() {
		return sound;
	},
	// Declared read-only on ComposerContext so no other part writes it; the
	// setter exists for ComposerInput alone, which registers its element here
	// on mount. See the note at the top of types.ts.
	textareaRef: {
		get current() {
			return textareaEl.value;
		},
		set current(next: HTMLTextAreaElement | null) {
			textareaEl.value = next;
		},
	},
	submit,
	stop,
	setValue,
	insertText,
	addFiles,
	removeAttachment,
};

provide(COMPOSER_CONTEXT_KEY, context);

function handleSubmit(event: Event) {
	// Nothing here navigates: the draft leaves through onSubmit.
	event.preventDefault();
	submit();
}
</script>

<template>
	<form
		ref="el"
		:class="[
			cn('ft-composer relative flex w-full flex-col border p-2', className),
			{ 'ft-composer-disabled': disabled },
		]"
		:data-streaming="streaming ? '' : undefined"
		@submit="handleSubmit"
	>
		<template v-if="$slots.default">
			<slot />
		</template>
		<template v-else>
			<ComposerInput :placeholder="placeholder" />
			<div class="mt-2 flex items-center gap-2">
				<div class="flex-1"></div>
				<ComposerSubmit />
			</div>
		</template>

		<div v-if="$slots.accessory" class="ft-composer-accessory absolute inset-0 z-10">
			<slot name="accessory" />
		</div>
	</form>
</template>

<style scoped>
/*
 * The surface is a form, not a card: it reads as one input the whole row of
 * controls lives inside, which is why the focus ring belongs to the container
 * rather than to the textarea buried in it.
 */
.ft-composer {
	border-radius: var(--ft-composer-radius, 0.75rem);
	border-color: var(--ft-composer-border, color-mix(in oklab, currentColor 14%, transparent));
	background: var(--ft-composer-bg, color-mix(in oklab, currentColor 4%, transparent));
}

.ft-composer:focus-within {
	border-color: var(--ft-composer-border-focus, color-mix(in oklab, currentColor 32%, transparent));
	box-shadow: 0 0 0 1px var(--ft-composer-ring, color-mix(in oklab, currentColor 22%, transparent));
}

.ft-composer-disabled {
	opacity: var(--ft-composer-disabled-opacity, 0.6);
}

@media (prefers-reduced-motion: no-preference) {
	.ft-composer {
		transition:
			border-color 150ms ease,
			box-shadow 150ms ease;
	}
}
</style>
