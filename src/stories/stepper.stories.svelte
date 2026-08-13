<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Stepper, Step } from "$lib/fancy-ui/stepper";

	const { Story } = defineMeta({
		title: "Navigation/Stepper",
		component: Stepper,
		tags: ["autodocs"],
		args: {
			current: 1,
			orientation: "horizontal",
			clickable: false,
		},
		argTypes: {
			current: { control: "number", description: "The active step's 0-based index. Bindable" },
			orientation: {
				control: "select",
				options: ["horizontal", "vertical"],
				description: "The rail's stacking axis",
			},
			clickable: {
				control: "boolean",
				description: "Whether steps render as buttons a reader can click to jump between them",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<Stepper {...args}>
		<Step label="Account" />
		<Step label="Profile" />
		<Step label="Confirmation" />
	</Stepper>
{/snippet}

{#snippet descriptionsTemplate(args: any)}
	<Stepper {...args} class="max-w-sm">
		<Step label="Account" description="Create your login" />
		<Step label="Profile" description="Tell us about yourself" />
		<Step label="Confirmation" description="Review and finish" />
	</Stepper>
{/snippet}

<Story name="Default" {template} />

<Story name="First step" {template} args={{ current: 0 }} />

<Story name="Last step" {template} args={{ current: 2 }} />

<Story name="Clickable" {template} args={{ current: 0, clickable: true }} />

<Story name="Vertical" template={descriptionsTemplate} args={{ orientation: "vertical" }} />
