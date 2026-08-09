<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { IconButton } from "$lib/fancy-ui/icon-button";

	const { Story } = defineMeta({
		title: "Actions/IconButton",
		component: IconButton,
		tags: ["autodocs"],
		args: {
			label: "Settings",
			variant: "outline",
			size: "md",
			shape: "square",
		},
		argTypes: {
			label: { control: "text", description: "Accessible name — required" },
			variant: {
				control: "select",
				options: ["primary", "secondary", "outline", "ghost", "accent", "destructive"],
				description: "Visual treatment, forwarded to the underlying Button",
			},
			size: {
				control: "select",
				options: ["sm", "md", "lg"],
				description: "Square footprint (30 / 36 / 42px) and resting radius",
			},
			shape: {
				control: "select",
				options: ["square", "circle"],
				description: "Square keeps the size's own radius; circle rounds it fully",
			},
			disabled: { control: "boolean", description: "Greys the control out, blocks activation" },
			loading: {
				control: "boolean",
				description: "Spinner in place of the icon, aria-busy, blocks activation",
			},
			href: { control: "text", description: "Render as an anchor element when provided" },
		},
	});
</script>

{#snippet gear()}
	<svg
		class="size-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<circle cx="12" cy="12" r="3" />
		<path
			d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"
		/>
	</svg>
{/snippet}

{#snippet template(args: any)}
	<IconButton {...args}>{@render gear()}</IconButton>
{/snippet}

<Story name="Outline" {template} />

<Story name="Primary" {template} args={{ variant: "primary" }} />

<Story name="Secondary" {template} args={{ variant: "secondary" }} />

<Story name="Ghost" {template} args={{ variant: "ghost" }} />

<Story name="Accent" {template} args={{ variant: "accent" }} />

<Story name="Destructive" {template} args={{ variant: "destructive" }} />

<Story name="Small" {template} args={{ size: "sm" }} />

<Story name="Large" {template} args={{ size: "lg" }} />

<Story name="Circle" {template} args={{ shape: "circle" }} />

<Story name="Loading" {template} args={{ loading: true }} />

<Story name="Disabled" {template} args={{ disabled: true }} />

<Story name="As Link" {template} args={{ href: "https://example.com" }} />
