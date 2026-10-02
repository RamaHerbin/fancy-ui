<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface PromptSuggestionsProps {
	/** Prompt texts offered to the user, in display order */
	suggestions: string[];
	/** Called with the chosen prompt and its index when a pill is activated */
	onSelect?: (suggestion: string, index: number) => void;
	/** Whether the pills are shown; flipping this to true replays the entrance */
	visible?: boolean;
	/** Delay between two consecutive pills entering, in milliseconds. Defaults to
	 * 60ms via a CSS fallback — omit this prop to let an ancestor's
	 * `--ft-suggestions-stagger` theme the whole subtree instead. */
	staggerMs?: number;
	/** Accessible name of the group wrapping the pills */
	label?: string;
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
import { computed, ref, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { sound as soundFx } from "../../sound/sound.js";

defineOptions({ name: "PromptSuggestions", inheritAttrs: false });

const {
	suggestions,
	onSelect,
	visible = true,
	staggerMs = undefined,
	label = "Suggestions",
	class: className,
	sound = false,
} = defineProps<PromptSuggestionsProps>();

defineSlots<{
	item?(props: { suggestion: string; index: number }): unknown;
}>();

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

/** Mirrors the CSS fallback on `--ft-suggestions-delay` below. */
const DEFAULT_STAGGER_MS = 60;
/** Past this the last pill of a long row would still be waiting long after the reply landed. */
const MAX_STAGGER_MS = 400;

// A negative stagger would drop later pills in mid-entrance rather than
// delaying them, which reads as a glitch instead of a cascade. `undefined`
// is left alone: the inline custom property is only ever written when the
// caller actually passed a value, so an ancestor's `--ft-suggestions-stagger`
// is free to theme the subtree otherwise.
const stagger = computed(() =>
	staggerMs === undefined ? undefined : Math.min(Math.max(staggerMs, 0), MAX_STAGGER_MS)
);

// Recreating the pills is what restarts their CSS animation, so the keyed
// v-for hangs off a counter that only moves when `visible` flips false →
// true. The watcher reads `visible` and writes `generation` — never the
// other way round; the counter's source and the previous value are plain
// locals so nothing it touches can schedule it again.
const generation = ref(0);
let generationSource = 0;
let wasVisible: boolean | null = null;

// Pre-flush, so the re-key and the unhiding land in the same DOM update: a
// post-flush bump would show the previous pills for a frame at full opacity
// before replacing them with ones animating up from zero.
watch(
	() => visible,
	(isVisible) => {
		// The first run only adopts the mounted value — a component that starts
		// out visible has not transitioned, and re-keying it would throw away the
		// pills the browser is already animating.
		if (wasVisible !== null && isVisible && !wasVisible) {
			generationSource += 1;
			generation.value = generationSource;
		}
		wasVisible = isVisible;
	},
	{ flush: "pre", immediate: true }
);

const rootStyle = computed(() => ({
	...(stagger.value === undefined ? {} : { "--ft-suggestions-stagger": `${stagger.value}ms` }),
	...(visible ? {} : { display: "none" }),
}));

/** A pick is an activation, not a change of a selected value — no changed-only guard. */
function pick(suggestion: string, index: number) {
	if (sound) soundFx.play("select");
	onSelect?.(suggestion, index);
}
</script>

<template>
	<div
		ref="el"
		:class="cn('flex flex-wrap items-center gap-2', className)"
		:style="rootStyle"
		role="group"
		:aria-label="label"
	>
		<button
			v-for="(suggestion, i) in suggestions"
			:key="`${generation}:${i}`"
			type="button"
			class="ft-suggestion border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground focus-visible:ring-ring cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
			:style="{ '--ft-suggestions-delay': `calc(var(--ft-suggestions-stagger, ${DEFAULT_STAGGER_MS}ms) * ${i})` }"
			@click="pick(suggestion, i)"
		>
			<slot name="item" :suggestion="suggestion" :index="i">{{ suggestion }}</slot>
		</button>
	</div>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
	.ft-suggestion {
		/*
		 * `backwards` holds the pill at the keyframe's starting opacity through
		 * its delay. Without it every pill would paint fully opaque first and
		 * then drop out to fade back in, one at a time.
		 */
		animation: ft-suggestions-enter var(--ft-suggestions-duration, 220ms) ease-out backwards;
		animation-delay: var(--ft-suggestions-delay, 0ms);
	}

	@keyframes ft-suggestions-enter {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
}

/*
 * Reduced motion leaves the pills exactly where they land. The entrance is the
 * only motion in the component, so there is nothing here to override.
 */
</style>
