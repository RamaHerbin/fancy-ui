<script setup lang="ts">
import { ref } from "vue";
import {
	cn,
	Checkbox,
	DatePicker,
	FormField,
	Input,
	RadioGroup,
	RadioGroupItem,
	Select,
	Switch,
	Textarea,
} from "fancy-ui-vue";

// SSR/hydration gate for form controls. Each control sits in its own
// FormField, so the field context (label/description/error ids) is
// published and consumed during the server render too.
const name = ref("");
const bio = ref("");
const subscribed = ref(false);
const notifications = ref(false);
const size = ref("m");
const plan = ref("");
// A fixed date keeps the server and client calendars identical.
const startDate = ref<Date | null>(new Date(2026, 0, 15));

const planOptions = [
	{ value: "free", label: "Free" },
	{ value: "pro", label: "Pro" },
	{ value: "team", label: "Team" },
];
</script>

<template>
	<main :class="cn('mx-auto max-w-2xl p-8')">
		<h1 :class="cn('text-2xl font-semibold')">forms</h1>

		<form :class="cn('mt-4 flex flex-col gap-4')">
			<FormField label="Name" description="As it appears on your profile." required>
				<Input v-model:value="name" placeholder="Ada Lovelace" name="name" />
			</FormField>

			<FormField label="Bio" error="Keep it under 160 characters.">
				<Textarea v-model:value="bio" placeholder="A short bio" name="bio" :rows="3" />
			</FormField>

			<FormField description="We send one email a month.">
				<Checkbox v-model:checked="subscribed" label="Subscribe to updates" name="subscribed" />
			</FormField>

			<FormField valid description="Notifications are ready.">
				<Switch v-model:checked="notifications" label="Enable notifications" name="notifications" />
			</FormField>

			<FormField label="Size">
				<RadioGroup v-model:value="size" name="size" orientation="horizontal">
					<RadioGroupItem value="s" label="Small" />
					<RadioGroupItem value="m" label="Medium" />
					<RadioGroupItem value="l" label="Large" />
				</RadioGroup>
			</FormField>

			<FormField label="Plan">
				<Select
					v-model:value="plan"
					:options="planOptions"
					placeholder="Choose a plan"
					name="plan"
				/>
			</FormField>

			<FormField label="Start date">
				<DatePicker v-model:value="startDate" name="start" locale="en-US" />
			</FormField>
		</form>
	</main>
</template>
