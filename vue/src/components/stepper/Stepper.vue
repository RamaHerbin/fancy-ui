<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface StepperProps {
	/** Called with the new index whenever it changes, however the change happened. */
	onCurrentChange?: (current: number) => void;
	/** The rail's stacking axis. Defaults to `"horizontal"`. */
	orientation?: "horizontal" | "vertical";
	/** Whether steps render as buttons a reader can click to jump between them. Defaults to `false`. */
	clickable?: boolean;
	/** Called with a step's index when it's activated by a click. Only fires when `clickable`. */
	onStepClick?: (index: number) => void;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the select cue through the sound controller. Off by default;
	 * only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { sound as soundFx } from "../../sound/sound.js";
import { createReducedMotion } from "../../internals/motion/media-query.js";
import { STEPPER_KEY, type StepperContext } from "./types.js";

defineOptions({ name: "Stepper", inheritAttrs: false });

const {
	onCurrentChange,
	orientation = "horizontal",
	clickable = false,
	onStepClick,
	class: className,
	sound = false,
} = defineProps<StepperProps>();

const current = defineModel<number>("current", { default: 0 });

const el = useTemplateRef<HTMLOListElement>("el");
defineExpose({ ref: el });

defineSlots<{ default?(): unknown }>();

// Ids, not elements: a `Step` can register the instant its own mount hook
// runs, with no need to wait on a template ref to have landed first. A
// plain `ref<string[]>` (not a Set): push/splice on it notify subscribers
// the same way Svelte's deep array proxy does.
//
// Unlike the Svelte source, registration here runs from `Step`'s own
// `onMounted`/`onBeforeUnmount` rather than from inside a tracked effect, so
// there is no analogue of Svelte's `untrack` requirement — `onMounted` does
// not establish a reactive dependency, so mutating this array from it can
// never make the mount hook itself re-run.
const registered = ref<string[]>([]);

function register(id: string): () => void {
	if (!registered.value.includes(id)) registered.value.push(id);
	return () => {
		const index = registered.value.indexOf(id);
		if (index !== -1) registered.value.splice(index, 1);
	};
}

// Motion is opt-in on the client only: SSR (and the hydration pass)
// renders the still composition, and the animated classes arrive once the
// browser has actually been asked about `prefers-reduced-motion`. Under
// reduce they never arrive, so the rails fill by colour alone.
const reduced = createReducedMotion();
const asked = ref(false);
onMounted(() => {
	const stop = reduced.start();
	asked.value = true;
	onBeforeUnmount(stop);
});
const animate = computed(() => asked.value && !reduced.current);

// Where the light set off from: the active index *before* the latest
// change. Steps read it to order the rail sweeps (and the arrival of the
// bullets behind them) as one continuous run from the old step to the new
// one, instead of every rail lighting in the same frame. It starts at 0 —
// not at `current` — so the first paint plays the same run from the first
// step, a one-time arrival over rails that are already filled.
// `settled` is a plain variable on purpose: it is bookkeeping, not
// something anything renders from. A `flush: 'pre'` watcher (Svelte's
// `$effect.pre`) so `origin` lands before the steps re-render.
const origin = ref(0);
let settled = current.value;
watch(
	current,
	(next) => {
		if (next === settled) return;
		origin.value = settled;
		settled = next;
	},
	{ flush: "pre" }
);

function indexOf(id: string): number {
	return registered.value.indexOf(id);
}

function select(index: number) {
	if (!clickable) return;
	if (sound && current.value !== index) soundFx.play("select");
	onStepClick?.(index);
	current.value = index;
	onCurrentChange?.(index);
}

const context: StepperContext = {
	get orientation() {
		return orientation;
	},
	get clickable() {
		return clickable;
	},
	get current() {
		return current.value;
	},
	get count() {
		return registered.value.length;
	},
	get origin() {
		return origin.value;
	},
	get animate() {
		return animate.value;
	},
	register,
	indexOf,
	select,
};

STEPPER_KEY.provide(context);
</script>

<template>
	<ol
		ref="el"
		role="list"
		:class="
			cn(
				'ft-stepper flex list-none',
				orientation === 'vertical' ? 'flex-col' : 'w-full items-start',
				className
			)
		"
		:data-orientation="orientation"
		:data-motion="animate ? 'full' : 'reduced'"
	>
		<slot />
	</ol>
</template>

<!--
  No scoped <style> here: the root `<ol>` itself never paints the brand
  purple — only a `Step`'s current bullet, halo, and lit rail do — so
  `--ft-nav-accent` is declared there instead, the same split ToggleGroup
  (no purple of its own) and ToggleGroupItem (declares
  `--ft-toggle-group-accent` locally for its focus ring) already use.
-->
