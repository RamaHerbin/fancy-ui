<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Props for StreamText
 */
export interface StreamTextProps {
	/** The whole text so far. Hand over a longer string to stream more in. */
	text: string;
	/** How long a newly arrived chunk stays tinted, in ms. */
	settleMs?: number;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, watch } from "vue";
import { cn } from "../utils.js";
import { createTextStream } from "./stream-text.js";
import "./stream-text.css";

defineOptions({ name: "StreamText", inheritAttrs: false });

const { text, settleMs = 350, class: className } = defineProps<StreamTextProps>();

// Built once, with the initial text already settled: the server renders the
// whole string as a single plain span and only later growth animates. Reading
// `text` here captures its first value only — `setup()` runs once, so this is
// already the untracked read the source calls out. `settleMs` goes in as a
// getter (the reactive-props-destructure transform rewrites it to `props.settleMs`)
// so a later duration reaches later chunks instead of leaving them on the
// mount-time timeout the CSS no longer matches.
const stream = createTextStream(text, { settleMs: () => settleMs });

// Reconciles the stream with every later `text`. No `immediate`: the stream
// was built from the first value, so the source's own first run is a no-op
// here and a watcher that never fires before mount also never runs on the
// server. `flush: "post"` keeps the push after the DOM patch, so a growth step
// never flashes the previous content for a frame.
watch(
	() => text,
	(t) => stream.push(t),
	{ flush: "post" }
);

onBeforeUnmount(() => stream.destroy());

// The `fresh` class below is applied by spreading a whole attribute object,
// not by `:class`. The source writes `class:ft-fresh={segment.fresh}` and the
// React counterpart `className={fresh ? "ft-fresh" : undefined}`; both emit NO
// attribute on a settled segment. Vue's `:class` cannot reproduce that: every
// falsy form — the object `{ 'ft-fresh': fresh }`, a ternary onto `undefined`,
// or onto `null` — goes through `normalizeClass`, which returns `""`, and the
// segment ships `class=""` on the client and in the server markup alike. That
// is measured, not assumed: with `:class="segment.fresh ? 'ft-fresh' :
// undefined"` the SSR output is `<span class="">Hello world</span>` and the
// client's `getAttribute("class")` is `""`, which is why that spelling is not
// used here despite being the direct transliteration of the React side.
// Leaving the key out of the props object altogether is the only way to leave
// the attribute out, so a settled segment is `<span>` exactly as it is on the
// other two sides. Verified on both render paths in `StreamText.test.ts`.
</script>

<template>
	<span
		:class="cn('ft-stream', className)"
		:style="{ whiteSpace: 'pre-wrap', '--ft-settle': `${settleMs}ms` }"
		><span
			v-for="segment in stream.segments"
			:key="segment.id"
			v-bind="segment.fresh ? { class: 'ft-fresh' } : {}"
			>{{ segment.text }}</span
		></span
	>
</template>
