<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface TextGenerateEffectProps {
	words: string;
	filter?: boolean;
	duration?: number;
	delay?: number;
	stagger?: number;
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";

defineOptions({ name: "TextGenerateEffect", inheritAttrs: false });

const {
	words,
	filter = true,
	duration = 0.7,
	delay = 0,
	stagger = 200,
	class: className,
} = defineProps<TextGenerateEffectProps>();

// The per-span style below is bound as a STRING, not an object: a string style
// is written to the element only when the string itself changes, so a re-render
// caused by anything else leaves the opacity and filter the reveal wrote in
// place. An object style is re-applied key by key on every patch, which would
// push an already revealed word back to opacity 0 and blur it again.
const wordsArray = computed(() => words.split(" "));
const scopeRef = useTemplateRef<HTMLDivElement>("scopeRef");

type RevealSpan = HTMLSpanElement & { _tid?: ReturnType<typeof setTimeout> };

// The spans the running reveal targets, and its outer delay timer. Each span
// carries its own word timeout id, so tearing a reveal down clears exactly the
// nodes it scheduled, even after a `words` change replaced them in the DOM.
let revealSpans: NodeListOf<RevealSpan> | null = null;
let revealTimeout: ReturnType<typeof setTimeout> | null = null;

function stopReveal() {
	if (revealTimeout) clearTimeout(revealTimeout);
	revealTimeout = null;
	revealSpans?.forEach((span) => {
		if (span._tid) clearTimeout(span._tid);
	});
	revealSpans = null;
}

function startReveal() {
	const scope = scopeRef.value;
	if (!scope) return;
	const spans = scope.querySelectorAll<RevealSpan>("span");
	revealSpans = spans;

	revealTimeout = setTimeout(() => {
		revealTimeout = null;
		spans.forEach((span, index) => {
			// Store timeout ID for cleanup
			span._tid = setTimeout(() => {
				span.style.opacity = "1";
				span.style.filter = filter ? "blur(0px)" : "none";
			}, index * stagger);
		});
	}, delay);
}

onMounted(startReveal);

// A new `words` value renders new spans at opacity 0: re-arm the reveal against
// them once the DOM is patched, dropping the previous run's timers. Upstream
// fix, beyond the Svelte source, whose reveal is mount-only.
watch(
	() => words,
	() => {
		stopReveal();
		startReveal();
	},
	{ flush: "post" }
);

onBeforeUnmount(stopReveal);
</script>

<template>
	<div :class="cn('leading-snug tracking-wide', className)">
		<div ref="scopeRef">
			<span
				v-for="(word, idx) in wordsArray"
				:key="word + idx"
				class="inline-block"
				:style="`opacity: 0; filter: ${
					filter ? 'blur(10px)' : 'none'
				}; transition: opacity ${duration}s, filter ${duration}s;`"
				>{{ word }}&nbsp;</span
			>
		</div>
	</div>
</template>
