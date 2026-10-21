<script setup lang="ts">
import { ref } from "vue";
import { Button, Reveal } from "fancy-ui-vue";

const features = [
	{ title: "Fast setup", body: "Drop it around any content, no config required." },
	{
		title: "Accessible by default",
		body: "Keyboard focus and reduced motion are both handled for you.",
	},
	{ title: "Themeable", body: "Every timing and distance is a CSS variable." },
];

// Changing the key remounts Reveal, which plays the entrance again.
const replayKey = ref(0);
</script>

<template>
	<div class="flex w-full flex-col gap-4 p-6">
		<div class="flex justify-end">
			<Button variant="outline" size="sm" @click="replayKey++">Replay</Button>
		</div>

		<Reveal
			:key="replayKey"
			trigger="mount"
			:stagger="80"
			class="grid grid-cols-1 gap-4 sm:grid-cols-3"
		>
			<div
				v-for="feature in features"
				:key="feature.title"
				class="bg-card border-border rounded-lg border p-4"
			>
				<h3 class="text-foreground text-sm font-semibold">{{ feature.title }}</h3>
				<p class="text-muted-foreground mt-1 text-sm">{{ feature.body }}</p>
			</div>
		</Reveal>
	</div>
</template>
