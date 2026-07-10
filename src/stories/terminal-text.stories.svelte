<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { TerminalText } from "$lib/fancy-ui/terminal-text";

	const { Story } = defineMeta({
		title: "Text/TerminalText",
		component: TerminalText,
		tags: ["autodocs"],
		args: {
			lines: [
				"[INFO]  boot sequence complete",
				"[WARN]  memory fragmentation at sector 0x4A2F",
				"[INFO]  kernel patch applied successfully",
				"[OK]    all systems nominal",
			],
			speed: 25,
			delay: 0,
			cursor: true,
			cursorChar: "█",
			glitch: false,
		},
		argTypes: {
			lines: { control: "object", description: "Array of lines to stream character by character" },
			speed: { control: "number", description: "Delay between each character in ms" },
			delay: { control: "number", description: "Initial delay before streaming starts in ms" },
			cursor: { control: "boolean", description: "Show blinking cursor" },
			cursorChar: { control: "text", description: "Character used as the cursor" },
			glitch: {
				control: "boolean",
				description: "Enable random character glitch effect after streaming",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-96 rounded-lg border border-neutral-800 bg-black p-5 text-green-400">
		<TerminalText {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="No Cursor" {template} args={{ cursor: false }} />

<Story
	name="With Glitch"
	{template}
	args={{ lines: ["initializing neural core...", "> ACCESS GRANTED"], glitch: true }}
/>
