<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface Logo {
	name: string;
	path: string;
}

export interface AnimatedLogoCloudProps {
	/** Additional CSS classes for the scrolling container */
	class?: HTMLAttributes["class"];
	/** Optional title displayed above the logos */
	title?: string;
	/** Array of logos with name and image path */
	logos?: Logo[];
}
</script>

<script setup lang="ts">
import { cn } from "../../utils.js";

defineOptions({ name: "AnimatedLogoCloud", inheritAttrs: false });

const { class: className, title, logos = [] } = defineProps<AnimatedLogoCloudProps>();
</script>

<template>
	<div class="w-full py-12">
		<div class="mx-auto w-full px-4 md:px-8">
			<div v-if="title" class="text-muted-foreground text-center font-medium">
				{{ title }}
			</div>
			<div
				:class="cn('logo-cloud-mask group relative mt-6 flex gap-6 overflow-hidden p-2', className)"
			>
				<div
					v-for="i in 5"
					:key="i"
					class="logo-cloud-scroll flex shrink-0 flex-row justify-around gap-6"
				>
					<img
						v-for="(logo, j) in logos"
						:key="j"
						:src="logo.path"
						:alt="logo.name"
						class="h-10 w-28 px-2 brightness-0 dark:invert"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.logo-cloud-mask {
	mask-image: linear-gradient(to left, transparent 0%, black 20%, black 80%, transparent 95%);
}

.logo-cloud-scroll {
	animation: logo-cloud-scroll 30s linear infinite;
}

@keyframes logo-cloud-scroll {
	0% {
		transform: translateX(0);
	}
	100% {
		transform: translateX(calc(-100% - 1.5rem));
	}
}
</style>
