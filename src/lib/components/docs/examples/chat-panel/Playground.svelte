<script lang="ts">
	import { ChatPanel, ChatEmptyState } from "$lib/fancy-ui/chat-panel";
	import { ChatMessage } from "$lib/fancy-ui/chat-message";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";

	const turns: { role: "user" | "assistant"; content: string }[] = [
		{ role: "user", content: "Why does my transcript jump around while an answer comes in?" },
		{
			role: "assistant",
			content: "Something scrolls it for you on every chunk, wherever you were.",
		},
		{ role: "user", content: "And if I scroll up to re-read something?" },
		{
			role: "assistant",
			content: "The panel only follows the bottom while you are already there.",
		},
		{ role: "user", content: "So I can read in peace?" },
		{ role: "assistant", content: "Yes. A pill brings you back down when you are ready." },
	];
</script>

<PropsPlayground
	component="ChatPanel"
	slug="chat-panel"
	constraints={["Give it a fixed height: the message region scrolls inside it."]}
	controls={[
		{ key: "empty", type: "boolean", label: "Empty" },
		{ key: "streaming", type: "boolean", label: "Streaming" },
		{ key: "returnLabel", type: "text", label: "Return label", maxLength: 30 },
		{ key: "label", type: "text", label: "Label", maxLength: 30 },
		{ key: "sound", type: "boolean", label: "Sound" },
	]}
	initialValues={{
		empty: false,
		streaming: false,
		returnLabel: "Jump to latest",
		label: "Conversation",
		sound: false,
	}}
>
	{#snippet preview(values)}
		<div class="h-[22rem] w-[28rem] max-w-[85vw]">
			<ChatPanel
				empty={values.empty as boolean}
				streaming={values.streaming as boolean}
				returnLabel={values.returnLabel as string}
				label={values.label as string}
				sound={values.sound as boolean}
			>
				{#snippet header()}
					<div class="flex items-center justify-between gap-3 px-4 py-3">
						<p class="text-sm font-semibold">Scrolling behaviour</p>
					</div>
				{/snippet}
				{#snippet emptyState()}
					<ChatEmptyState title="How can I help?" description="Ask anything about the library." />
				{/snippet}
				<div class="flex flex-col gap-5 px-4 py-4">
					{#each turns as turn, i (i)}
						<ChatMessage role={turn.role} content={turn.content} />
					{/each}
				</div>
			</ChatPanel>
		</div>
	{/snippet}
</PropsPlayground>
