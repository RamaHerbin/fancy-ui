<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { TerminalBlock } from "$lib/fancy-ui/terminal-block";

	const ESC = "\u001b";
	const green = (text: string) => `${ESC}[32m${text}${ESC}[0m`;
	const red = (text: string) => `${ESC}[1;31m${text}${ESC}[0m`;
	const yellow = (text: string) => `${ESC}[33m${text}${ESC}[0m`;
	const cyan = (text: string) => `${ESC}[36m${text}${ESC}[0m`;

	const RUNNING = [
		"building for production…",
		`${green("✓")} 214 modules transformed`,
		`${yellow("warning:")} "createElapsed" is exported but never used`,
		`${cyan("build/entry.js")}      12.4 kB │ gzip:  4.1 kB`,
	].join("\n");

	const SUCCESS = `${RUNNING}\n${cyan("build/app.js")}        94.7 kB │ gzip: 28.9 kB\n${green("✓")} built in 3.42s\n`;

	const FAILURE = [
		"building for production…",
		`${green("✓")} 118 modules transformed`,
		`${red("error:")} could not resolve "./_internals/waveform-core.js"`,
		"  imported by src/lib/fancy-ui/audio-wave/AudioWave.svelte",
	].join("\n");

	const { Story } = defineMeta({
		title: "AI Agents/TerminalBlock",
		component: TerminalBlock,
		tags: ["autodocs"],
		args: {
			output: SUCCESS,
			command: "pnpm build",
			prompt: "$",
			running: false,
			exitCode: 0,
			durationMs: 3420,
			ansi: true,
			maxHeight: "20rem",
		},
		argTypes: {
			output: { control: "text", description: "Everything the command has printed so far" },
			command: { control: "text", description: "The command shown after the prompt glyph" },
			prompt: { control: "text", description: "Prompt glyph in front of the command" },
			running: {
				control: "boolean",
				description: "Whether the command is still running — shows the cursor, pins the scroll",
			},
			exitCode: {
				control: "number",
				description: "Exit status; null while the command is still in flight",
			},
			durationMs: { control: "number", description: "How long the run took, shown in the footer" },
			ansi: { control: "boolean", description: "Read the SGR subset and colour the output" },
			maxHeight: { control: "text", description: "Height at which the output starts scrolling" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-full max-w-2xl p-6">
		<TerminalBlock {...args} />
	</div>
{/snippet}

{#snippet titled(args: any)}
	<div class="w-full max-w-2xl p-6">
		<TerminalBlock {...args}>
			{#snippet header()}
				<span class="flex items-center gap-1.5" aria-hidden="true">
					<span class="size-2.5 rounded-full bg-red-400/90"></span>
					<span class="size-2.5 rounded-full bg-amber-400/90"></span>
					<span class="size-2.5 rounded-full bg-emerald-400/90"></span>
				</span>
				<span class="ml-auto text-xs opacity-60">build.log</span>
			{/snippet}
		</TerminalBlock>
	</div>
{/snippet}

<Story
	name="Running"
	{template}
	args={{ output: RUNNING, running: true, exitCode: null, durationMs: undefined }}
/>

<Story name="Success" {template} />

<Story
	name="Failure"
	{template}
	args={{ output: FAILURE, exitCode: 1, durationMs: 1180, command: "pnpm build" }}
/>

<Story name="With a title bar" template={titled} />
