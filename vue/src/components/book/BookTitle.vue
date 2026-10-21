<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Props for BookTitle
 */
export interface BookTitleProps {
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { useAttrs } from "vue";

import { cn } from "../../utils.js";

defineOptions({ name: "BookTitle", inheritAttrs: false });

const props = withDefaults(defineProps<BookTitleProps>(), {
	class: "",
});

const attrs = useAttrs();

defineSlots<{ default?(): unknown }>();
</script>

<template>
	<h1 v-bind="attrs" :class="cn('mt-3 mb-1 font-bold text-balance select-none', props.class)">
		<slot></slot>
	</h1>
</template>
