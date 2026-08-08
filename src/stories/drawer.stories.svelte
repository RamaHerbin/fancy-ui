<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Drawer } from "$lib/fancy-ui/drawer";
	import { Button } from "$lib/fancy-ui/button";

	const { Story } = defineMeta({
		title: "Overlays/Drawer",
		component: Drawer,
		tags: ["autodocs"],
		args: {
			dismissible: true,
			swipeToClose: true,
			title: "Filters",
			description: "Drag down to close.",
		},
		argTypes: {
			dismissible: {
				control: "boolean",
				description:
					"Whether Escape, the scrim, the close button and the swipe gesture can close the drawer",
			},
			swipeToClose: {
				control: "boolean",
				description: "Whether dragging the handle down past the threshold closes the drawer",
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
	<Button onclick={() => (open = true)}>Open drawer</Button>
	<Drawer {...args} bind:open>
		<p class="text-muted-foreground text-[13px]">Body content goes here.</p>
	</Drawer>
{/snippet}

<Story name="Default" {template} />

<Story name="No Swipe" {template} args={{ swipeToClose: false }} />

<Story name="Not Dismissible" {template} args={{ dismissible: false, swipeToClose: false }} />
