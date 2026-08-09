<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Button } from "$lib/fancy-ui/button";

	const { Story } = defineMeta({
		title: "Actions/Button",
		component: Button,
		tags: ["autodocs"],
		args: {
			variant: "primary",
			size: "md",
		},
		argTypes: {
			variant: {
				control: "select",
				options: ["primary", "secondary", "outline", "ghost", "accent", "destructive"],
				description: "Visual treatment",
			},
			size: {
				control: "select",
				options: ["sm", "md", "lg"],
				description: "Padding / font-size / radius scale",
			},
			disabled: { control: "boolean", description: "Greys the button out, blocks activation" },
			loading: {
				control: "boolean",
				description: "Spinner in place of iconStart, aria-busy, blocks activation — no dimming",
			},
			fullWidth: { control: "boolean", description: "Stretches to fill its container" },
			href: { control: "text", description: "Render as an anchor element when provided" },
		},
	});
</script>

{#snippet template(args: any)}
	<Button {...args}>Button</Button>
{/snippet}

{#snippet fullWidthTemplate(args: any)}
	<div class="w-80">
		<Button {...args}>Button</Button>
	</div>
{/snippet}

<Story name="Primary" {template} />

<Story name="Secondary" {template} args={{ variant: "secondary" }} />

<Story name="Outline" {template} args={{ variant: "outline" }} />

<Story name="Ghost" {template} args={{ variant: "ghost" }} />

<Story name="Accent" {template} args={{ variant: "accent" }} />

<Story name="Destructive" {template} args={{ variant: "destructive" }} />

<Story name="Small" {template} args={{ size: "sm" }} />

<Story name="Large" {template} args={{ size: "lg" }} />

<Story name="Loading" {template} args={{ loading: true }} />

<Story name="Disabled" {template} args={{ disabled: true }} />

<Story name="Full Width" template={fullWidthTemplate} args={{ fullWidth: true }} />

<Story name="As Link" {template} args={{ href: "https://example.com" }} />
