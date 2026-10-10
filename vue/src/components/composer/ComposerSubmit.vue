<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Props for ComposerSubmit
 */
export interface ComposerSubmitProps {
	/** Accessible name while the composer is idle. */
	label?: string;
	/** Accessible name while a response is streaming. */
	stopLabel?: string;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, inject } from "vue";

import { cn } from "../../utils.js";
import { COMPOSER_CONTEXT_KEY, type ComposerContext } from "./types.js";

defineOptions({ name: "ComposerSubmit", inheritAttrs: false });

const { label = "Send", stopLabel = "Stop", class: className } = defineProps<ComposerSubmitProps>();

defineSlots<{
	/** Replaces the built-in icon. Rendered in both the send and the stop state. */
	default?(): unknown;
}>();

// Undefined when the button is used outside a Composer: it then renders as a
// permanently disabled button rather than throwing.
const composer = inject<ComposerContext | undefined>(COMPOSER_CONTEXT_KEY, undefined);

const streaming = computed(() => composer?.streaming ?? false);
const empty = computed(
	() =>
		(composer?.value.current ?? "").trim() === "" &&
		(composer?.attachments.current.length ?? 0) === 0
);
// A stop button with nothing to call is a lie, so it goes grey — which is also
// what happens with no context at all.
// `composer.stop` is always a function — the root publishes one whether or not
// a consumer passed `onStop` — so the context reports separately whether there
// is anything behind it.
const stoppable = computed(() => composer?.stoppable ?? false);
// Outside a composer both branches land on disabled: there is nothing to stop,
// and an absent draft is an empty one.
const isDisabled = computed(
	() => (composer?.disabled ?? false) || (streaming.value ? !stoppable.value : empty.value)
);

const name = computed(() => (streaming.value ? stopLabel : label));

// The source hands the button `onclick` only while streaming; an idle send
// button carries no handler at all and submits through the form. A single
// handler gated on the same flag is the same behaviour — a click while idle
// still reaches the form's own submit.
function handleClick() {
	if (!streaming.value) return;
	composer?.stop();
}
</script>

<template>
	<button
		:type="streaming ? 'button' : 'submit'"
		:class="
			cn(
				'ft-composer-submit bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-ring inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40',
				className
			)
		"
		:disabled="isDisabled"
		:aria-label="name"
		:title="name"
		@click="handleClick"
	>
		<slot v-if="$slots.default" />
		<svg v-else-if="streaming" viewBox="0 0 16 16" class="size-3.5" aria-hidden="true">
			<rect x="3" y="3" width="10" height="10" rx="2" fill="currentColor" />
		</svg>
		<svg
			v-else
			viewBox="0 0 16 16"
			class="size-4"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M14 2 2 6.8l4.6 2.6L9.2 14z" />
			<path d="M14 2 6.6 9.4" />
		</svg>
	</button>
</template>
