<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { BlurReveal } from "$lib/fancy-ui/blur-reveal";

	const { Story } = defineMeta({
		title: "Text/BlurReveal",
		component: BlurReveal,
		tags: ["autodocs"],
		args: {
			duration: 1,
			delay: 0.2,
			blur: "20px",
			yOffset: 20,
		},
		argTypes: {
			duration: { control: "number", description: "Animation duration in seconds" },
			delay: { control: "number", description: "Stagger delay between children in seconds" },
			blur: { control: "text", description: "Initial blur amount (CSS value)" },
			yOffset: { control: "number", description: "Initial vertical offset in pixels" },
		},
	});
</script>

{#snippet template(args: any)}
	<BlurReveal {...args}>
		<h3 class="mb-4 text-2xl font-bold">Welcome to the future</h3>
		<p class="mb-3 text-neutral-500">
			This paragraph fades in after the heading, with a slight delay.
		</p>
		<p class="text-neutral-500">And this one follows with another staggered delay.</p>
	</BlurReveal>
{/snippet}

<Story name="Default" {template} />

<Story name="Fast Reveal" {template} args={{ duration: 0.5, delay: 0.1 }} />

<Story name="Heavy Blur" {template} args={{ blur: "40px", yOffset: 40 }} />
