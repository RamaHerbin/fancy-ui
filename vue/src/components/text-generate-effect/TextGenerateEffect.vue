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
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from "vue";
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

onMounted(() => {
	const scope = scopeRef.value;
	if (!scope) return;
	const spans = scope.querySelectorAll<HTMLSpanElement>("span");

	const timeout = setTimeout(() => {
		spans.forEach((span, index) => {
			const wordTimeout = setTimeout(() => {
				span.style.opacity = "1";
				span.style.filter = filter ? "blur(0px)" : "none";
			}, index * stagger);

			// Store timeout ID for cleanup
			(span as HTMLSpanElement & { _tid?: ReturnType<typeof setTimeout> })._tid = wordTimeout;
		});
	}, delay);

	// The span list is captured once, here: the reveal writes its timeout id onto
	// the nodes that exist at mount, and those are the nodes the teardown has to
	// clear — re-querying at unmount would miss any span a `words` change replaced.
	onBeforeUnmount(() => {
		clearTimeout(timeout);
		spans.forEach((span) => {
			const tid = (span as HTMLSpanElement & { _tid?: ReturnType<typeof setTimeout> })._tid;
			if (tid) clearTimeout(tid);
		});
	});
});
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
