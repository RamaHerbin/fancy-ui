<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import {
		Composer,
		ComposerInput,
		ComposerSubmit,
		ComposerToolbar,
		ComposerModelPicker,
		ComposerAttachments,
		ComposerCommandMenu,
	} from "$lib/fancy-ui/composer";
	import type { AttachmentData, CommandItemData, ModelOptionData } from "$lib/fancy-ui";

	/** Generic tiers, so the fixture says nothing about anyone's product line-up. */
	const MODELS: ModelOptionData[] = [
		{ id: "mini", label: "Mini", badge: "Fast", description: "Short answers, small context." },
		{ id: "pro", label: "Pro", description: "Deeper reasoning, slower." },
		{ id: "max", label: "Max", badge: "New", description: "Everything, when it matters." },
	];

	const COMMANDS: CommandItemData[] = [
		{ id: "deploy", label: "/deploy", description: "Ship the current branch", hint: "⌘⏎" },
		{ id: "describe", label: "/describe", description: "Summarise the diff" },
		{ id: "tests", label: "/tests", description: "Run the affected suites" },
		{ id: "reset", label: "/reset", description: "Clear the conversation" },
	];

	const PEOPLE: CommandItemData[] = [
		{ id: "jordan", label: "@jordan", description: "Reviewer" },
		{ id: "sam", label: "@sam", description: "On call" },
		{ id: "robin", label: "@robin", description: "Release manager" },
	];

	const FILES: AttachmentData[] = [
		{ id: "a1", name: "architecture.png", size: 184_320, status: "done" },
		{ id: "a2", name: "release-notes.md", size: 4_096, progress: 0.62, status: "uploading" },
		{ id: "a3", name: "trace.json", size: 1_048_576, status: "error" },
	];

	const { Story } = defineMeta({
		title: "AI Chat/Composer",
		component: Composer,
		tags: ["autodocs"],
		args: {
			placeholder: "Ask anything",
		},
		argTypes: {
			value: { control: "text", description: "The draft text, bindable. Cleared by a submit" },
			placeholder: {
				control: "text",
				description: "Placeholder for the default input; ignored once children replace it",
			},
			disabled: {
				control: "boolean",
				description: "Blocks typing, sending, and attaching",
			},
			streaming: {
				control: "boolean",
				description: "A response is arriving: the send button becomes a stop button",
			},
		},
	});
</script>

<script lang="ts">
	// Bindings the composed stories need. The root owns the draft on its own, so
	// the minimal stories bind nothing at all.
	let model = $state("pro");
	let attachments = $state<AttachmentData[]>(FILES);
</script>

{#snippet template(args: any)}
	<div class="w-full max-w-xl p-6">
		<Composer {...args} />
	</div>
{/snippet}

{#snippet composed(args: any)}
	<div class="w-full max-w-xl p-6">
		<Composer {...args} bind:attachments>
			{#snippet children()}
				<ComposerAttachments accept="image/*,.pdf,.md" />
				<ComposerInput placeholder="Ask anything — / for commands, @ to mention" maxRows={6} />
				<ComposerToolbar class="mt-2">
					<ComposerModelPicker models={MODELS} bind:value={model} />
					<div class="flex-1"></div>
					<ComposerSubmit />
				</ComposerToolbar>

				<!-- One primitive, two triggers: only one menu can ever be up. -->
				<ComposerCommandMenu trigger="/" items={COMMANDS} />
				<ComposerCommandMenu trigger="@" items={PEOPLE} />
			{/snippet}
		</Composer>
	</div>
{/snippet}

<Story name="Minimal" {template} />

<Story name="Full" template={composed} />

<Story
	name="Streaming"
	{template}
	args={{ value: "Summarise what changed in the release job", streaming: true }}
/>

<Story name="Disabled" {template} args={{ value: "Waiting on the session", disabled: true }} />
