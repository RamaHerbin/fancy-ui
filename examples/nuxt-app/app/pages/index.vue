<script setup lang="ts">
import { cn } from "fancy-ui-vue";
</script>

<template>
	<!--
		No library components exist yet (scaffold-only wave). This page is a static
		placeholder that proves `cn` resolves and the Tailwind scan compiles.
	-->
	<main :class="cn('mx-auto max-w-2xl p-8')">
		<h1 :class="cn('text-2xl font-semibold')">fancy-ui-vue example (Nuxt)</h1>
		<p :class="cn('mt-2 text-sm text-neutral-500')">
			SSR + static generation CI gate for fancy-ui-vue.
		</p>
	</main>
</template>
