<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { SmoothCursor } from "$lib/fancy-ui/smooth-cursor";

	// SmoothCursor attaches to the document and replaces the native cursor. It is
	// scoped to the Storybook canvas iframe (not the surrounding UI), so it is safe
	// to render here; move the pointer inside the canvas to see it follow.
	const { Story } = defineMeta({
		title: "Effects/SmoothCursor",
		component: SmoothCursor,
		tags: ["autodocs"],
		args: {
			springConfig: { damping: 45, stiffness: 400, mass: 1 },
		},
		argTypes: {
			springConfig: {
				control: "object",
				description: "Spring physics configuration with damping, stiffness, and mass",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<SmoothCursor {...args} />
	<div class="flex h-48 items-center justify-center rounded-lg border border-dashed">
		<p class="text-muted-foreground text-sm select-none">Move your cursor around the canvas</p>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story
	name="Bouncy"
	{template}
	args={{ springConfig: { damping: 20, stiffness: 300, mass: 1.2 } }}
/>
