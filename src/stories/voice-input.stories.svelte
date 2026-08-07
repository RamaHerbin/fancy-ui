<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { VoiceInput } from "$lib/fancy-ui/voice-input";

	const { Story } = defineMeta({
		title: "AI Chat/VoiceInput",
		component: VoiceInput,
		tags: ["autodocs"],
		args: {
			active: false,
			transcript: "",
			demo: true,
			height: 48,
		},
		argTypes: {
			active: {
				control: "boolean",
				description: "Whether a recording is in progress — bindable, and written by every button",
			},
			transcript: {
				control: "text",
				description: "Live text pushed by the consumer; a growing string grows in place",
			},
			demo: {
				control: "boolean",
				description: "Draw a synthetic waveform when no samples arrive",
			},
			height: {
				control: { type: "range", min: 16, max: 240, step: 4 },
				description: "Waveform height in CSS pixels, clamped to 16..240",
			},
			color: {
				control: "color",
				description: "Any CSS colour for the bars, resolved before painting",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-full max-w-md p-6">
		<VoiceInput {...args} />
	</div>
{/snippet}

<Story name="Idle" {template} />

<Story name="Active" {template} args={{ active: true }} />

<Story
	name="With Transcript"
	{template}
	args={{ active: true, transcript: "show me the retry policy for failed webhook deliveries" }}
/>
