<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Pressable } from "$lib/fancy-ui/pressable";

	const { Story } = defineMeta({
		title: "Buttons/Pressable",
		component: Pressable,
		tags: ["autodocs"],
		args: {
			scale: 0.97,
			haptic: false,
			disabled: false,
		},
		argTypes: {
			scale: {
				control: { type: "number", min: 0.8, max: 1, step: 0.01 },
				description: "Target scale() factor while pressed",
			},
			haptic: {
				control: "select",
				options: [false, "light", "medium", "heavy", "success", "error"],
				description: "Touch-only vibration pattern fired on pointerdown; false never vibrates",
			},
			disabled: {
				control: "boolean",
				description: "Suppresses every listener; data-pressed never appears",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="flex min-h-[160px] items-center justify-center p-10">
		<Pressable {...args}>
			<button
				type="button"
				class="bg-primary text-primary-foreground rounded-full px-5 py-2.5 text-sm font-medium"
			>
				Save changes
			</button>
		</Pressable>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Stronger scale" {template} args={{ scale: 0.9 }} />

<Story name="With haptic" {template} args={{ haptic: "light" }} />

<Story name="Disabled" {template} args={{ disabled: true }} />

{#snippet link(args: any)}
	<div class="flex min-h-[160px] items-center justify-center p-10">
		<Pressable {...args}>
			<a
				href="#demo"
				class="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
			>
				Learn more →
			</a>
		</Pressable>
	</div>
{/snippet}

<Story name="Wrapping a link" template={link} />
