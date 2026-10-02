<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { PartState } from "../types.js";

export interface BadgeProps {
	variant?: "default" | "solid" | "blue" | "red" | "yellow" | "green" | "purple";
	/** Force a visual state for the /skins state matrix. */
	demoState?: PartState;
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { cn } from "../../utils.js";
import { useSkin } from "../context.js";

defineOptions({ name: "Badge", inheritAttrs: false });

const { variant = "default", demoState, class: className } = defineProps<BadgeProps>();

defineSlots<{ default?: () => unknown }>();

const ctx = useSkin();
const parts = computed(() => ctx.skin.recipes.badge({ variant, state: demoState }));
</script>

<template>
	<span :class="cn(parts.root, className)"><slot /></span>
</template>
