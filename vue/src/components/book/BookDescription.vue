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
import { useAttrs } from "vue";

import { cn } from "../../utils.js";

defineOptions({ name: "BookDescription", inheritAttrs: false });

const props = withDefaults(defineProps<BookDescriptionProps>(), {
	class: "",
});

const attrs = useAttrs();

defineSlots<{ default?(): unknown }>();
</script>

<template>
	<p v-bind="attrs" :class="cn('text-xs/relaxed select-none', props.class)">
		<slot></slot>
	</p>
</template>
