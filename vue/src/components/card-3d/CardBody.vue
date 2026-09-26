<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface CardBodyProps {
	/** Classes for the body div. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { cn } from "../../utils.js";

defineOptions({ name: "CardBody", inheritAttrs: false });

const { class: className = "" } = defineProps<CardBodyProps>();

defineSlots<{ default?(): unknown }>();
</script>

<template>
	<div :class="cn('h-96 w-96', className)" style="transform-style: preserve-3d">
		<slot />
	</div>
</template>
