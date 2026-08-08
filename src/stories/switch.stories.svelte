<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Switch } from "$lib/fancy-ui/switch";

	const { Story } = defineMeta({
		title: "Forms/Switch",
		component: Switch,
		tags: ["autodocs"],
		args: {
			checked: false,
			disabled: false,
			required: false,
			size: "md",
		},
		argTypes: {
			checked: { control: "boolean", description: "Whether the switch is on" },
			disabled: { control: "boolean", description: "Blocks interaction" },
			required: { control: "boolean", description: "Native required" },
			size: { control: "select", options: ["sm", "md", "lg"], description: "Track/knob size" },
			label: { control: "text", description: "Accessible name with no visible children" },
		},
	});
</script>

{#snippet template(args: any)}
	<Switch {...args}>Notifications</Switch>
{/snippet}

{#snippet sizesTemplate()}
	<div class="flex items-center gap-6">
		<Switch size="sm" checked label="Small, on" />
		<Switch size="md" checked label="Medium, on" />
		<Switch size="lg" checked label="Large, on" />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="On" {template} args={{ checked: true }} />

<Story name="Disabled" {template} args={{ disabled: true }} />

<Story name="Sizes" template={sizesTemplate} />
