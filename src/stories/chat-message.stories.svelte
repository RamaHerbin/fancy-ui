<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import {
		ChatMessage,
		ChatMessageActions,
		ChatMessageAction,
		ChatMessageBranches,
	} from "$lib/fancy-ui/chat-message";

	const answer =
		"Alignment carries the role: a filled bubble on the right for the person, plain flowing text on the left for the answer. The controls stay out of the way until you reach for them.";

	const { Story } = defineMeta({
		title: "AI Chat/ChatMessage",
		component: ChatMessage,
		tags: ["autodocs"],
		args: {
			role: "assistant",
			content: answer,
			streaming: false,
			markdown: false,
		},
		argTypes: {
			role: {
				control: "select",
				options: ["user", "assistant", "system"],
				description: "Who produced the turn — drives alignment, chrome, and the accessible name",
			},
			content: { control: "text", description: "The message body; a growing string streams in" },
			streaming: {
				control: "boolean",
				description: "Whether the content is still arriving",
			},
			markdown: {
				control: "boolean",
				description: "Render the body as markdown instead of a tinted plain-text stream",
			},
		},
	});
</script>

<script lang="ts">
	let version = $state(2);
	let liked = $state(false);
</script>

{#snippet template(args: any)}
	<div class="max-w-xl p-6">
		<ChatMessage {...args} />
	</div>
{/snippet}

{#snippet composed(args: any)}
	<div class="max-w-xl p-6">
		<ChatMessage {...args}>
			{#snippet avatar()}
				<span
					class="flex size-8 items-center justify-center rounded-full bg-indigo-500/15 text-xs font-semibold text-indigo-500"
				>
					AI
				</span>
			{/snippet}

			{#snippet actions()}
				<!-- alwaysVisible so the rail is on screen without hovering the canvas. -->
				<ChatMessageActions alwaysVisible>
					<ChatMessageAction label="Copy answer" confirmLabel="Copied" onclick={() => {}}>
						<svg
							class="size-3.5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<rect x="9" y="9" width="12" height="12" rx="2" />
							<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
						</svg>
					</ChatMessageAction>

					<ChatMessageAction label="Good answer" active={liked} onclick={() => (liked = !liked)}>
						<svg
							class="size-3.5"
							viewBox="0 0 24 24"
							fill={liked ? "currentColor" : "none"}
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z" />
							<path
								d="M7 10 12 3a2.5 2.5 0 0 1 2.4 3.2L13.5 9h5a2 2 0 0 1 2 2.4l-1.4 7A2 2 0 0 1 17 20H7"
							/>
						</svg>
					</ChatMessageAction>
				</ChatMessageActions>
			{/snippet}

			{#snippet footer()}
				<ChatMessageBranches index={version} count={3} onNavigate={(next) => (version = next)} />
			{/snippet}
		</ChatMessage>
	</div>
{/snippet}

<Story
	name="User"
	{template}
	args={{ role: "user", content: "What makes a transcript read like a conversation?" }}
/>

<Story name="Assistant" {template} />

<Story name="Streaming" {template} args={{ streaming: true, content: answer.slice(0, 96) }} />

<Story
	name="System"
	{template}
	args={{ role: "system", content: "Switched to a longer context." }}
/>

<Story name="WithBranches" template={composed} args={{ timestamp: Date.now() - 2 * 60 * 1000 }} />
