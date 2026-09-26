<script setup lang="ts">
import { cn } from "fancy-ui-vue";

// No library components exist yet (scaffold-only wave). This block stands in
// for a dialog/overlay component that will land here later. It is rendered
// open (not toggled) so that <Teleport> runs on the server during
// `nuxt generate` and the SSR/hydration gate exercises portalled content.
</script>

<template>
	<main :class="cn('mx-auto max-w-2xl p-8')">
		<h1 :class="cn('text-2xl font-semibold')">overlay</h1>
		<Teleport to="body">
			<div :class="cn('fixed inset-0 z-50 flex items-center justify-center bg-black/50')">
				<div :class="cn('rounded-md bg-white p-6 text-sm dark:bg-neutral-900')">
					Dialog placeholder (rendered open)
				</div>
			</div>
		</Teleport>
	</main>
</template>
