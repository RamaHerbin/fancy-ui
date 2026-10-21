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
} from "fancy-ui-vue";

const clicks = ref(0);
const name = ref("");
const framework = ref("vue");
const open = ref(false);
const frameworks = [
	{ value: "svelte", label: "Svelte 5" },
	{ value: "react", label: "React" },
	{ value: "vue", label: "Vue" },
];
</script>

<template>
	<main class="bg-background text-foreground mx-auto flex max-w-xl flex-col gap-6 p-8">
		<h1 class="text-2xl font-semibold">fancy-ui-vue consumer</h1>

		<div class="flex flex-wrap items-center gap-3">
			<Button>Primary button</Button>
			<RainbowButton data-testid="rainbow" @click="clicks += 1">Rainbow</RainbowButton>
			<span data-testid="clicks">Rainbow clicked {{ clicks }} times</span>
		</div>

		<Input v-model:value="name" label="Name" placeholder="Your name" />
		<Select
			v-model:value="framework"
			:options="frameworks"
			label="Framework"
			class="w-[220px]"
		/>

		<Dialog
			v-model:open="open"
			title="Invite a member"
			description="Send an email invite to join the workspace."
		>
			<template #trigger>
				<Button variant="outline">Open dialog</Button>
			</template>
			<p>Dialog body</p>
		</Dialog>

		<div class="relative overflow-hidden rounded-xl border p-6">
			Light effect
			<BorderBeam />
		</div>

		<div class="relative h-48 overflow-hidden rounded-xl border" data-testid="fluid">
			<FluidCursor contained />
		</div>
	</main>
</template>
