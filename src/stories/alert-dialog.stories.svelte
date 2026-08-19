<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { AlertDialog } from "$lib/fancy-ui/alert-dialog";

	const { Story } = defineMeta({
		title: "Overlays/AlertDialog",
		component: AlertDialog,
		tags: ["autodocs"],
		args: {
			open: true,
			title: "Delete this project?",
			description: "This action is irreversible. All data will be lost.",
			confirmLabel: "Delete",
			cancelLabel: "Cancel",
		},
		argTypes: {
			open: { control: "boolean", description: "Whether the alert dialog is open" },
			title: { control: "text", description: "The heading" },
			description: { control: "text", description: "The warning copy under the title" },
			confirmLabel: { control: "text", description: "Label of the destructive action" },
			cancelLabel: { control: "text", description: "Label of the safe action" },
		},
	});
</script>

{#snippet template(args: any)}
	<AlertDialog {...args} />
{/snippet}

<Story name="Default" {template} />

<Story
	name="Non-destructive Confirmation"
	{template}
	args={{
		title: "Sign out of all devices?",
		description: "Every other session, on every device, ends immediately.",
		confirmLabel: "Sign out",
		cancelLabel: "Stay signed in",
	}}
/>

<Story name="No Description" {template} args={{ description: undefined }} />
