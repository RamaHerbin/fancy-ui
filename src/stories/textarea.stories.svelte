<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Textarea } from "$lib/fancy-ui/textarea";

	const { Story } = defineMeta({
		title: "Forms/Textarea",
		component: Textarea,
		tags: ["autodocs"],
		args: {
			placeholder: "A multi-line message…",
			label: "Message",
			rows: 3,
		},
		argTypes: {
			value: { control: "text", description: "Current value" },
			placeholder: { control: "text", description: "Shown while the field is empty" },
			disabled: { control: "boolean", description: "Blocks focus and typing" },
			readonly: { control: "boolean", description: "Blocks typing, stays focusable and submitted" },
			required: { control: "boolean", description: "Native required" },
			invalid: { control: "boolean", description: "Error border plus aria-invalid" },
			label: { control: "text", description: "Accessible name with no visible Label" },
			rows: { control: "number", description: "Visible height in text rows" },
			maxlength: { control: "number", description: "Native character ceiling" },
			showCount: { control: "boolean", description: 'Renders the live "n / max" counter' },
			autoResize: { control: "boolean", description: "Grows to fit content instead of scrolling" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-80">
		<Textarea {...args} />
	</div>
{/snippet}

<Story name="Resting" {template} />

<Story name="Error" {template} args={{ value: "Too short", invalid: true }} />

<Story name="Disabled" {template} args={{ value: "Disabled", disabled: true }} />

<Story
	name="With Counter"
	{template}
	args={{ value: "A multi-line message with resizing…", maxlength: 500, showCount: true }}
/>

<Story name="Auto Resize" {template} args={{ autoResize: true, rows: 2 }} />
