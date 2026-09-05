<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Skeleton } from "$lib/fancy-ui/skeleton";

	const { Story } = defineMeta({
		title: "Feedback/Skeleton",
		component: Skeleton,
		tags: ["autodocs"],
		args: {
			variant: "text",
			lines: 3,
			animation: "shimmer",
			loading: true,
			label: "Loading",
		},
		argTypes: {
			variant: {
				control: "select",
				options: ["rect", "text", "circle"],
				description: "Bone shape",
			},
			lines: {
				control: "number",
				description: 'Number of text lines; only read when variant="text"',
			},
			animation: {
				control: "select",
				options: ["shimmer", "pulse", "none"],
				description: "Shimmer sweep, opacity pulse, or a static muted bone",
			},
			loading: { control: "boolean", description: "Whether the placeholder is showing" },
			label: {
				control: "text",
				description: 'The one screen-reader announcement; pass "" to silence it',
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="flex h-32 w-full max-w-sm items-center justify-center">
		<Skeleton {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Rect" {template} args={{ variant: "rect", lines: 1, class: "h-16 w-48" }} />

<Story name="Circle" {template} args={{ variant: "circle", lines: 1, class: "size-12" }} />

<Story name="Pulse" {template} args={{ animation: "pulse" }} />

<Story name="No Animation" {template} args={{ animation: "none" }} />

{#snippet wrappingTemplate(args: any)}
	<div class="flex h-32 w-full max-w-sm items-center justify-center">
		<Skeleton {...args}>
			<p class="text-foreground text-sm">Your invoice is ready.</p>
		</Skeleton>
	</div>
{/snippet}

<Story name="Wrapping Content" template={wrappingTemplate} args={{ loading: false }} />
