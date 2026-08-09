<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Link } from "$lib/fancy-ui/link";

	const { Story } = defineMeta({
		title: "Actions/Link",
		component: Link,
		tags: ["autodocs"],
		args: {
			href: "/docs/components/link",
			variant: "default",
			underline: "hover",
			external: false,
		},
		argTypes: {
			href: { control: "text", description: "Destination URL" },
			variant: {
				control: { type: "select" },
				options: ["default", "muted"],
				description: "Visual weight",
			},
			external: {
				control: "boolean",
				description: "Off-site destination: arrow glyph, new tab, safe rel",
			},
			underline: {
				control: { type: "select" },
				options: ["hover", "always", "none"],
				description: "When the underline shows",
			},
			target: { control: "text", description: "Anchor target" },
			rel: { control: "text", description: "Anchor rel" },
		},
	});
</script>

{#snippet template(args: any)}
	<p class="text-sm">
		Read the <Link {...args}>component docs</Link> before shipping.
	</p>
{/snippet}

<Story name="Default" {template} />

<Story name="Muted" {template} args={{ variant: "muted" }} />

<Story name="External" {template} args={{ external: true, href: "https://svelte.dev" }} />

<Story name="Always Underlined" {template} args={{ underline: "always" }} />

<Story name="Never Underlined" {template} args={{ underline: "none" }} />
