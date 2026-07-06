<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Timeline } from "$lib/fancy-ui/timeline";

	const items = [
		{ id: "step-3", label: "Step 3" },
		{ id: "step-2", label: "Step 2" },
		{ id: "step-1", label: "Step 1" },
	];

	// Timeline tracks window scroll to drive its progress line, so the story is
	// rendered at natural height and the Storybook canvas iframe is scrolled to
	// reveal the effect (an inner overflow container would not fire the listener).
	const { Story } = defineMeta({
		title: "Navigation/Timeline",
		component: Timeline,
		tags: ["autodocs"],
		args: {
			items,
			title: "Project Timeline",
			description: "Key milestones and updates.",
		},
		argTypes: {
			items: { control: "object", description: "Timeline entries with id and label" },
			title: { control: "text", description: "Heading text" },
			description: { control: "text", description: "Subheading text" },
		},
	});
</script>

{#snippet template(args: any)}
	<Timeline {...args}>
		{#snippet content(item)}
			<div class="space-y-4">
				<h3 class="text-foreground text-lg font-semibold md:hidden">{item.label}</h3>
				<div class="bg-card rounded-lg border p-4">
					<h4 class="mb-2 font-semibold">{item.label}</h4>
					<p class="text-muted-foreground text-sm">
						Content for {item.label}. The timeline shows scroll-driven progress.
					</p>
				</div>
			</div>
		{/snippet}
	</Timeline>
{/snippet}

<Story name="Default" {template} />

<Story
	name="Release History"
	{template}
	args={{
		title: "Release History",
		description: "How the product evolved over time.",
		items: [
			{ id: "v3", label: "v3.0" },
			{ id: "v2", label: "v2.0" },
			{ id: "v1", label: "v1.0" },
		],
	}}
/>
