<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { ChatPanel, ChatEmptyState } from "$lib/fancy-ui/chat-panel";
	import { ChatMessage } from "$lib/fancy-ui/chat-message";
	import { PromptSuggestions } from "$lib/fancy-ui/prompt-suggestions";

	const answer =
		"It only follows the bottom while you are already there. Scroll up to re-read something and the panel lets go, offering a pill to take you back down when you are done.";

	const { Story } = defineMeta({
		title: "AI Chat/ChatPanel",
		component: ChatPanel,
		tags: ["autodocs"],
		args: {
			streaming: false,
			empty: false,
			returnLabel: "Jump to latest",
		},
		argTypes: {
			streaming: {
				control: "boolean",
				description: "Whether a reply is still arriving — pins the scroll region to its bottom",
			},
			empty: {
				control: "boolean",
				description: "Renders the emptyState snippet in place of the message stream",
			},
			returnLabel: {
				control: "text",
				description: "Label on the pill offered once the reader scrolls away from the bottom",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="h-[26rem] w-full max-w-xl p-6">
		<ChatPanel {...args}>
			{#snippet header()}
				<div class="flex items-center justify-between gap-3 px-4 py-3">
					<h3 class="text-sm font-semibold">Scrolling behaviour</h3>
					<span class="text-muted-foreground font-mono text-xs">balanced · 200k</span>
				</div>
			{/snippet}

			<div class="flex flex-col gap-5 px-4 py-4">
				<ChatMessage role="user" content="What happens if I scroll up while an answer arrives?" />
				<ChatMessage role="assistant" content={answer} streaming={args.streaming} />
			</div>

			{#snippet emptyState()}
				<ChatEmptyState description="Ask about a thread, a deploy, or a file you are holding.">
					<PromptSuggestions
						suggestions={["Summarise this thread", "What broke the deploy?", "Draft a reply"]}
					/>
				</ChatEmptyState>
			{/snippet}

			{#snippet composer()}
				<div class="text-muted-foreground p-3 text-xs">
					The composer row sits here, and never scrolls with the transcript.
				</div>
			{/snippet}
		</ChatPanel>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Empty" {template} args={{ empty: true }} />

<Story name="Streaming" {template} args={{ streaming: true }} />
