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
import { ref, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { sound as soundFx } from "../../sound/sound.js";
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
	>
		<slot />
	</ol>
</template>

<!--
  No scoped <style> here: the root `<ol>` itself never paints the brand
  purple — only a `Step`'s current bullet, halo, and done connector do — so
  `--ft-nav-accent` is declared there instead, the same split ToggleGroup
  (no purple of its own) and ToggleGroupItem (declares
  `--ft-toggle-group-accent` locally for its focus ring) already use.
-->
