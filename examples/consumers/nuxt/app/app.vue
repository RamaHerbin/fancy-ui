<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
	Button,
	Input,
	Select,
	Switch,
	Dialog,
	RainbowButton,
	BorderBeam,
	FluidCursor,
} from "fancy-ui-vue";

const clicks = ref(0);
const buttonClicks = ref(0);
const name = ref("");
const nameUpdates = ref(0);
const fruit = ref("apple");
const notify = ref(false);
const open = ref(false);
const openUpdates = ref(0);
// Set once Vue has hydrated the server markup: the smoke waits for it before
// clicking, so a click can never land on a not-yet-interactive button.
const hydrated = ref(false);
onMounted(() => {
	hydrated.value = true;
});
const options = [
	{ value: "apple", label: "Apple" },
	{ value: "pear", label: "Pear" },
];

// Listeners on the library's models: the consumer's handler must receive the
// new value, with or without a v-model next to it.
function onName(value: string) {
	name.value = value;
	nameUpdates.value += 1;
}
function onOpen(value: boolean) {
	open.value = value;
	openUpdates.value += 1;
}
</script>

<template>
	<main
		class="mx-auto flex max-w-xl flex-col gap-6 p-8"
		:data-hydrated="hydrated ? 'true' : undefined"
	>
		<h1 class="text-2xl font-semibold">fancy-ui-vue consumer</h1>

		<div class="flex flex-wrap items-center gap-3">
			<Button data-testid="button" @click="buttonClicks += 1">Plain button</Button>
			<span data-testid="button-clicks">button clicks: {{ buttonClicks }}</span>
		</div>

		<Input :value="name" placeholder="Your name" label="Name" @update:value="onName" />
		<p data-testid="name-out">name: {{ name }} ({{ nameUpdates }} updates)</p>

		<Select v-model:value="fruit" :options="options" placeholder="Pick a fruit" label="Fruit" />
		<p data-testid="framework-out">framework: {{ fruit }}</p>

		<Switch v-model:checked="notify" aria-label="Notifications" />
		<p data-testid="notify-out">notifications: {{ notify ? "on" : "off" }}</p>

		<RainbowButton data-testid="rainbow" @click="clicks++">Click me</RainbowButton>
		<p data-testid="clicks">clicks: {{ clicks }}</p>

		<div class="relative overflow-hidden rounded-xl border p-8">
			Border beam
			<BorderBeam />
		</div>

		<div class="relative h-48 overflow-hidden rounded-xl border" data-testid="fluid">
			<FluidCursor contained />
		</div>

		<Dialog
			:open="open"
			title="Hello"
			description="A dialog from the packed tarball."
			@update:open="onOpen"
		>
			<template #trigger>
				<Button>Open dialog</Button>
			</template>
			<p data-testid="dialog-body">Dialog body</p>
			<template #footer>
				<Button data-testid="dialog-done" @click="open = false">Done</Button>
			</template>
		</Dialog>
		<p data-testid="open-out">open: {{ open }} ({{ openUpdates }} updates)</p>
	</main>
</template>
