<script setup lang="ts">
import { cn } from "fancy-ui-vue";

// No library components exist yet (scaffold-only wave). This block stands in
// for the plain, non-portalled, non-canvas components that land here later:
// ShimmerButton and Marquee.
</script>

<template>
	<main :class="cn('mx-auto max-w-2xl p-8')">
		<h1 :class="cn('text-2xl font-semibold')">plain</h1>
		<div :class="cn('mt-4 flex flex-col gap-4')">
			<div :class="cn('rounded-md border border-neutral-300 p-4 text-sm')">
				ShimmerButton placeholder
			</div>
			<div :class="cn('overflow-hidden rounded-md border border-neutral-300 p-4 text-sm')">
				Marquee placeholder
			</div>
		</div>
	</main>
</template>
