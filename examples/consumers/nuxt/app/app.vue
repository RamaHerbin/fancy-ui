<script setup lang="ts">
import { ref } from "vue";
import {
	Button,
	Input,
	Select,
	Dialog,
	RainbowButton,
	BorderBeam,
	FluidCursor,
} from "fancy-ui-vue";

const clicks = ref(0);
const name = ref("");
const fruit = ref("");
const open = ref(false);
const options = [
	{ value: "apple", label: "Apple" },
	{ value: "pear", label: "Pear" },
];
</script>

<template>
	<main class="mx-auto flex max-w-xl flex-col gap-6 p-8">
		<h1 class="text-2xl font-semibold">fancy-ui-vue consumer</h1>

		<Button>Plain button</Button>

		<Input v-model:value="name" placeholder="Your name" label="Name" />

		<Select v-model:value="fruit" :options="options" placeholder="Pick a fruit" label="Fruit" />

		<RainbowButton data-testid="rainbow" @click="clicks++">Click me</RainbowButton>
		<p data-testid="clicks">clicks: {{ clicks }}</p>

		<div class="relative overflow-hidden rounded-xl border p-8">
			Border beam
			<BorderBeam />
		</div>

		<div class="relative h-48 overflow-hidden rounded-xl border">
			<FluidCursor contained />
		</div>

		<Dialog v-model:open="open" title="Hello" description="A dialog from the packed tarball.">
			<template #trigger>
				<Button>Open dialog</Button>
			</template>
			<p>Dialog body</p>
		</Dialog>
	</main>
</template>
