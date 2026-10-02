<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { Logo } from "./AnimatedLogoCloud.vue";

export interface Wordmark {
	/** The brand/wordmark text */
	name: string;
	/** Font size in pixels */
	size: number;
	/** Font weight */
	weight: 400 | 700 | 900;
	/** Letter-spacing in pixels */
	tracking?: number;
	/** Render in italic */
	italic?: boolean;
	/** Use a serif font stack instead of the default */
	serif?: boolean;
	/** CSS text-transform */
	transform?: "uppercase" | "lowercase";
}

export interface StaticLogoCloudProps {
	/** Additional CSS classes for the grid container */
	class?: HTMLAttributes["class"];
	/** Optional title displayed above the logos */
	title?: string;
	/** Array of logos with name and image path */
	logos?: Logo[];
	/** When provided, renders a static typographic row of wordmarks instead of image logos */
	wordmarks?: Wordmark[];
}
</script>

<script setup lang="ts">
import { cn } from "../../utils.js";

defineOptions({ name: "StaticLogoCloud", inheritAttrs: false });

const { class: className, title, logos = [], wordmarks } = defineProps<StaticLogoCloudProps>();
</script>

<template>
	<div class="w-full py-12">
		<div class="flex w-full flex-col items-center justify-center gap-4 px-4 md:px-8">
			<div v-if="title" class="text-muted-foreground font-medium uppercase">
				{{ title }}
			</div>
			<div
				v-if="wordmarks"
				:class="cn('flex flex-wrap items-center justify-around gap-x-9 gap-y-5', className)"
			>
				<span
					v-for="(mark, i) in wordmarks"
					:key="i"
					:style="{
						fontSize: `${mark.size}px`,
						fontWeight: mark.weight,
						letterSpacing: mark.tracking !== undefined ? `${mark.tracking}px` : undefined,
						fontStyle: mark.italic ? 'italic' : undefined,
						fontFamily: mark.serif ? 'Georgia, \'Times New Roman\', serif' : undefined,
						textTransform: mark.transform,
						opacity: 0.85,
					}"
				>
					{{ mark.name }}
				</span>
			</div>
			<div v-else :class="cn('grid grid-cols-3 gap-x-4 md:grid-cols-5 lg:grid-cols-8', className)">
				<img
					v-for="(logo, i) in logos"
					:key="i"
					:src="logo.path"
					:alt="logo.name"
					class="h-10 w-28 px-2 brightness-0 dark:invert"
				/>
			</div>
		</div>
	</div>
</template>
