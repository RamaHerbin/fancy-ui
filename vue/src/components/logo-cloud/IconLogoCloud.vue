<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { Logo } from "./AnimatedLogoCloud.vue";

export interface IconLogoCloudProps {
	/** Additional CSS classes for the grid container */
	class?: HTMLAttributes["class"];
	/** Optional title displayed above the logos */
	title?: string;
	/** Array of logos with name and image path */
	logos?: Logo[];
}
</script>

<script setup lang="ts">
import { cn } from "../../utils.js";

defineOptions({ name: "IconLogoCloud", inheritAttrs: false });

const { class: className, title, logos = [] } = defineProps<IconLogoCloudProps>();
</script>

<template>
	<div class="w-full py-12">
		<div class="flex w-full flex-col items-center justify-center gap-6 px-4 md:px-8">
			<div v-if="title" class="text-muted-foreground font-medium">
				{{ title }}
			</div>
			<div :class="cn('grid grid-cols-3 md:grid-cols-8 lg:grid-cols-8', className)">
				<img
					v-for="(logo, i) in logos"
					:key="i"
					:src="logo.path"
					:alt="logo.name"
					class="h-7 w-12 px-2 brightness-0 dark:invert"
				/>
			</div>
		</div>
	</div>
</template>
