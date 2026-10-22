<script setup lang="ts">
import { ref } from "vue";
import {
	BorderBeam,
	Button,
	Dialog,
	FluidCursor,
	Input,
	RainbowButton,
	Select,
	Switch,
} from "fancy-ui-vue";

const clicks = ref(0);
const buttonClicks = ref(0);
const name = ref("");
const nameUpdates = ref(0);
const framework = ref("vue");
const notify = ref(false);
const open = ref(false);
const openUpdates = ref(0);
const frameworks = [
	{ value: "svelte", label: "Svelte 5" },
	{ value: "react", label: "React" },
	{ value: "vue", label: "Vue" },
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
	<main class="bg-background text-foreground mx-auto flex max-w-xl flex-col gap-6 p-8">
		<h1 class="text-2xl font-semibold">fancy-ui-vue consumer</h1>

		<div class="flex flex-wrap items-center gap-3">
			<Button data-testid="button" @click="buttonClicks += 1">Primary button</Button>
			<span data-testid="button-clicks">button clicks: {{ buttonClicks }}</span>
			<RainbowButton data-testid="rainbow" @click="clicks += 1">Rainbow</RainbowButton>
			<span data-testid="clicks">clicks: {{ clicks }}</span>
		</div>

		<Input :value="name" label="Name" placeholder="Your name" @update:value="onName" />
		<p data-testid="name-out">name: {{ name }} ({{ nameUpdates }} updates)</p>

		<Select v-model:value="framework" :options="frameworks" label="Framework" class="w-[220px]" />
		<p data-testid="framework-out">framework: {{ framework }}</p>

		<Switch v-model:checked="notify" aria-label="Notifications" />
		<p data-testid="notify-out">notifications: {{ notify ? "on" : "off" }}</p>

		<Dialog
			:open="open"
			title="Invite a member"
			description="Send an email invite to join the workspace."
			@update:open="onOpen"
		>
			<template #trigger>
				<Button variant="outline">Open dialog</Button>
			</template>
			<p data-testid="dialog-body">Dialog body</p>
			<template #footer>
				<Button data-testid="dialog-done" @click="open = false">Done</Button>
			</template>
		</Dialog>
		<p data-testid="open-out">open: {{ open }} ({{ openUpdates }} updates)</p>

		<div class="relative overflow-hidden rounded-xl border p-6">
			Light effect
			<BorderBeam />
		</div>

		<div class="relative h-48 overflow-hidden rounded-xl border" data-testid="fluid">
			<FluidCursor contained />
		</div>
	</main>
</template>
