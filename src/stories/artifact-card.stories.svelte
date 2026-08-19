<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { ArtifactCard } from "$lib/fancy-ui/artifact-card";

	const PREVIEW =
		"Revenue closed the quarter at 4.2M, six percent ahead of plan, and for the first time the mid-market segment outgrew enterprise. Two things drove it: the self-serve trial that shipped in May, which now accounts for a third of new logos, and a pricing change nobody expected much from. Churn is flat. The one number worth arguing about is expansion, which slipped for a second quarter running.";

	const { Story } = defineMeta({
		title: "AI Agents/ArtifactCard",
		component: ArtifactCard,
		tags: ["autodocs"],
		args: {
			title: "Q3 revenue review",
			kind: "Memo",
			status: "done",
			preview: PREVIEW,
		},
		argTypes: {
			title: { control: "text", description: "What the document is called" },
			kind: { control: "text", description: "The kind of thing it is, on the muted line" },
			status: {
				control: "select",
				options: ["idle", "streaming", "done", "error"],
				description: "Where the document is in its life",
			},
			preview: { control: "text", description: "The text so far — growing it is what streams" },
			version: { control: "number", description: "Which revision is on screen, 1-based" },
			versionCount: { control: "number", description: "How many revisions exist" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-full max-w-xl p-6">
		<ArtifactCard {...args} />
	</div>
{/snippet}

<Story name="Done" {template} />

<Story name="Streaming" {template} args={{ status: "streaming", preview: PREVIEW.slice(0, 190) }} />

<Story name="Error" {template} args={{ status: "error", preview: PREVIEW.slice(0, 90) }} />

<Story name="Idle" {template} args={{ status: "idle", preview: undefined }} />

<Story
	name="With Versions"
	{template}
	args={{ version: 3, versionCount: 5, onVersionChange: () => {} }}
/>

<Story name="Version Badge Only" {template} args={{ version: 2 }} />

<Story
	name="Openable"
	{template}
	args={{ version: 3, versionCount: 5, onVersionChange: () => {}, onOpen: () => {} }}
/>
