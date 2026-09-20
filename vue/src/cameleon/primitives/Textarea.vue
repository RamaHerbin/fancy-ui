<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { PartState } from "../types.js";

export interface TextareaProps {
	error?: boolean;
	demoState?: PartState;
	class?: HTMLAttributes["class"];
	value?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { useSkin } from "../context.js";

defineOptions({ name: "Textarea", inheritAttrs: false });

const { error = false, demoState, class: className } = defineProps<TextareaProps>();

const value = defineModel<string>("value", { default: "" });

const attrs = useAttrs();
const textarea = useTemplateRef<HTMLTextAreaElement>("textarea");
defineExpose({ ref: textarea });

const ctx = useSkin();
const parts = computed(() => ctx.skin.recipes.textarea({ state: demoState }));
</script>

<template>
	<textarea
		ref="textarea"
		v-model="value"
		:class="cn(parts.root, className)"
		:aria-invalid="error"
		v-bind="attrs"
	></textarea>
</template>
