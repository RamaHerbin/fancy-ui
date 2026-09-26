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
import { cn } from "../../utils.js";

defineOptions({ name: "BookTitle", inheritAttrs: false });

const props = withDefaults(defineProps<BookTitleProps>(), {
	class: "",
});
</script>

<template>
	<h1 :class="cn('mt-3 mb-1 font-bold text-balance select-none', props.class)">
		<slot></slot>
	</h1>
</template>
