<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Props for BookHeader
 */
export interface BookHeaderProps {
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { cn } from "../../utils.js";

defineOptions({ name: "BookHeader", inheritAttrs: false });

const props = withDefaults(defineProps<BookHeaderProps>(), {
	class: "",
});

defineSlots<{ default?(): unknown }>();
</script>

<template>
	<div :class="cn('flex flex-wrap gap-2', props.class)">
		<slot></slot>
	</div>
</template>
