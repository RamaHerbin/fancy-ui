<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Sheet } from "$lib/fancy-ui/sheet";
	import { Button } from "$lib/fancy-ui/button";

	const { Story } = defineMeta({
		title: "Overlays/Sheet",
		component: Sheet,
		tags: ["autodocs"],
		args: {
			side: "right",
			size: "md",
			dismissible: true,
			title: "Settings",
			description: "Update your workspace preferences.",
		},
		argTypes: {
			side: {
				control: "select",
				options: ["left", "right", "top", "bottom"],
				description: "Edge of the viewport the panel slides in from",
			},
			size: {
				control: "select",
				options: ["sm", "md", "lg"],
				description: "Panel width (left/right sides) or height (top/bottom sides)",
			},
			dismissible: {
				control: "boolean",
				description: "Whether Escape, the scrim and the close button can close the sheet",
			},
			title: { control: "text", description: "Heading, wired to aria-labelledby" },
			description: { control: "text", description: "Supporting text, wired to aria-describedby" },
		},
	});
</script>

<script lang="ts">
	let open = $state(false);
</script>

{#snippet template(args: any)}
	<Button onclick={() => (open = true)}>Open sheet</Button>
	<Sheet {...args} bind:open>
		<p class="text-muted-foreground text-[13px]">Body content goes here.</p>
	</Sheet>
{/snippet}

<Story name="Default" {template} />

<Story name="Left" {template} args={{ side: "left" }} />

<Story name="Top" {template} args={{ side: "top" }} />

<Story name="Bottom" {template} args={{ side: "bottom" }} />

<Story name="Large" {template} args={{ size: "lg" }} />

<Story name="Not Dismissible" {template} args={{ dismissible: false }} />
