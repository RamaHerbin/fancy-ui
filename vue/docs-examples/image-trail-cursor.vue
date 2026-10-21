<script setup lang="ts">
import { ref } from "vue";
import { ImageTrailCursor, type VariantType } from "fancy-ui-vue";

const images = [
	"https://picsum.photos/seed/trail1/400/440",
	"https://picsum.photos/seed/trail2/400/440",
	"https://picsum.photos/seed/trail3/400/440",
	"https://picsum.photos/seed/trail4/400/440",
];

const variants: { type: VariantType; label: string }[] = [
	{ type: "type1", label: "Fade & Scale" },
	{ type: "type3", label: "Float-up" },
	{ type: "type5", label: "Rotation" },
];

const variant = ref<VariantType>("type1");
</script>

<template>
	<div class="w-full">
		<div class="mb-4 flex flex-wrap gap-2">
			<button
				v-for="v in variants"
				:key="v.type"
				type="button"
				class="rounded-lg border px-3 py-1.5 text-sm"
				:aria-pressed="variant === v.type"
				@click="variant = v.type"
			>
				{{ v.label }}
			</button>
		</div>
		<div class="relative h-[500px] cursor-crosshair overflow-hidden rounded-lg border">
			<ImageTrailCursor :images="images" :variant="variant" />
			<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
				<p class="text-lg font-medium select-none">Move your cursor here</p>
			</div>
		</div>
	</div>
</template>
