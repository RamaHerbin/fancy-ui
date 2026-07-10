<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { NeonBorder } from "$lib/fancy-ui/neon-border";

	const { Story } = defineMeta({
		title: "Effects/NeonBorder",
		component: NeonBorder,
		tags: ["autodocs"],
		args: {
			color1: "#0496ff",
			color2: "#ff0a54",
			animationType: "half",
			duration: 6,
		},
		argTypes: {
			color1: { control: "color", description: "First neon color" },
			color2: { control: "color", description: "Second neon color" },
			animationType: {
				control: "select",
				options: ["none", "half", "full"],
				description: "Animation type: none (static), half (50% coverage), full (100% coverage)",
			},
			duration: {
				control: { type: "range", min: 1, max: 20, step: 1 },
				description: "Animation duration in seconds",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="flex w-[420px] items-center justify-center bg-neutral-950 p-10">
		<NeonBorder {...args}>
			<div
				class="flex h-full w-full items-center justify-center rounded-lg bg-neutral-950 px-6 py-2"
			>
				<span class="text-sm font-medium text-white">Neon Border</span>
			</div>
		</NeonBorder>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Full Rotation" {template} args={{ animationType: "full" }} />

<Story name="Static" {template} args={{ animationType: "none" }} />

<Story
	name="Emerald & Violet"
	{template}
	args={{ color1: "#10b981", color2: "#8b5cf6", duration: 3 }}
/>
