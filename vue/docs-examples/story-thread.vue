<script setup lang="ts">
import { ref } from "vue";
import { StoryThread, StoryNode } from "fancy-ui-vue";

const reached = ref("");
</script>

<template>
	<StoryThread
		layout="vertical"
		ariaLabel="Product story"
		:on-reach="(id: string) => (reached = id)"
	>
		<section class="relative flex min-h-48 items-center gap-6 py-10 pl-10">
			<StoryNode id="idea" class="absolute left-0" />
			<p>Last reached: {{ reached || "none" }}</p>
		</section>
		<section class="relative flex min-h-48 items-center gap-6 py-10 pl-10">
			<StoryNode id="build" class="absolute left-0" />
			<p>Build it.</p>
		</section>
		<section class="relative flex min-h-48 items-center gap-6 py-10 pl-10">
			<StoryNode id="ship" variant="ring" class="absolute left-0" />
			<p>Ship it.</p>
		</section>
	</StoryThread>
</template>
