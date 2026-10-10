<script lang="ts">
import type { ButtonHTMLAttributes, HTMLAttributes } from "vue";

export interface ButtonProps {
	variant?: "primary" | "secondary" | "destructive";
	size?: "sm" | "md" | "lg";
	loading?: boolean;
	/** Force a visual state for the /skins state matrix (non-interactive). */
	demoState?: "hover" | "active" | "focus";
	/** Read by the component (`disabled || loading`), so it is declared rather than a fallthrough attribute. */
	disabled?: boolean;
	type?: ButtonHTMLAttributes["type"];
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { useSkin } from "../context.js";
import type { RecipeArgs } from "../types.js";

defineOptions({ name: "Button", inheritAttrs: false });

const {
	variant = "primary",
	size = "md",
	loading = false,
	disabled = false,
	type = "button",
	demoState,
	class: className,
} = defineProps<ButtonProps>();

defineSlots<{ default?: () => unknown }>();

const attrs = useAttrs();
const root = useTemplateRef<HTMLButtonElement>("root");
defineExpose({ ref: root });

const ctx = useSkin();
const args = computed<RecipeArgs>(() => ({
	variant,
	size,
	state: demoState ?? (loading ? "loading" : disabled ? "disabled" : "default"),
}));
// Re-runs whenever the active skin changes → live art-direction swap.
const parts = computed(() => ctx.skin.recipes.button(args.value));
const trailing = computed(() => ctx.skin.ornaments?.buttonTrailing);
</script>

<template>
	<button
		ref="root"
		:type="type"
		:class="cn('cam-btn', parts.root, className)"
		:disabled="disabled || loading"
		:data-variant="variant"
		v-bind="attrs"
	>
		<span v-if="parts.label !== undefined" :class="parts.label"><slot /></span>
		<slot v-else />
		<component :is="trailing" v-if="trailing" v-bind="args" />
	</button>
</template>
