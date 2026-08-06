<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { TypingIndicator } from "$lib/fancy-ui/typing-indicator";

	const { Story } = defineMeta({
		title: "AI Chat/TypingIndicator",
		component: TypingIndicator,
		tags: ["autodocs"],
		args: {
			size: 6,
			color: "var(--ft-typing-color, currentColor)",
			speed: 1.2,
			label: "Typing",
		},
		argTypes: {
			size: { control: "number", description: "Dot diameter in pixels" },
			color: {
				control: "text",
				description: "Dot color; any CSS color or custom property expression",
			},
			speed: { control: "number", description: "Duration of one full animation cycle in seconds" },
			label: {
				control: "text",
				description: "Visually hidden text announced to assistive technology",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="flex h-32 w-full items-center justify-center">
		<TypingIndicator {...args} />
	</div>
{/snippet}

{#snippet bubble(args: any)}
	<div class="flex h-32 w-full items-center justify-center">
		<div class="bg-muted text-muted-foreground rounded-2xl rounded-bl-sm px-4 py-3.5">
			<TypingIndicator {...args} />
		</div>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="In a message bubble" template={bubble} args={{ label: "Assistant is typing" }} />

<Story name="Large and slow" {template} args={{ size: 12, speed: 1.8 }} />

<Story name="Custom color" {template} args={{ size: 10, color: "#6366f1" }} />
