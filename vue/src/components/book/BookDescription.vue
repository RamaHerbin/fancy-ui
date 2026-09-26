<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Props for BookDescription
 */
export interface BookDescriptionProps {
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { cn } from "../../utils.js";

defineOptions({ name: "BookDescription", inheritAttrs: false });

const props = withDefaults(defineProps<BookDescriptionProps>(), {
	class: "",
});
</script>

<template>
	<p :class="cn('text-xs/relaxed select-none', props.class)">
		<slot></slot>
	</p>
</template>
