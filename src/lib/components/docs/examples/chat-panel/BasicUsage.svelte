<script lang="ts">
	import { onMount } from "svelte";
	import { ChatPanel } from "$lib/fancy-ui/chat-panel";
	import { ChatMessage } from "$lib/fancy-ui/chat-message";
	import { Composer } from "$lib/fancy-ui/composer";

	interface Turn {
		id: string;
		role: "user" | "assistant";
		content: string;
	}

	const ANSWER =
		"Then it lets go. The panel only follows the bottom while you are already there, so scrolling up to re-read something is a decision it respects until you take the pill back down.";

	/** Between two words of the reply, and how long a finished answer sits there. */
	const WORD_MS = 45;
	const READ_MS = 3400;

	let turns = $state<Turn[]>([
		{
			id: "t1",
			role: "user",
			content: "Why does my transcript jump around while an answer is still coming in?",
		},
		{
			id: "t2",
			role: "assistant",
			content:
				"Because something is scrolling it for you on every chunk, whether or not you were at the bottom.",
		},
		{ id: "t3", role: "user", content: "And if I scroll up to re-read something?" },
	]);

	let draft = $state("");
	let reply = $state("");
	let streaming = $state(false);

	/** Outside the transcript, so a message you send never collides with a seeded id. */
	let sent = 0;

	function send(payload: { text: string }) {
		sent += 1;
		turns.push({ id: `sent-${sent}`, role: "user", content: payload.text });
	}

	onMount(() => {
		// A reply that retypes itself on a loop is exactly the motion this setting
		// is asking us not to run, so it gets the finished answer instead.
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			reply = ANSWER;
			return;
		}

		const words = ANSWER.split(" ");
		let timer: ReturnType<typeof setTimeout>;
		let i = 0;

		function word() {
			if (i < words.length) {
				// The whole reply so far, never just the delta — that is the contract.
				reply = i === 0 ? words[0] : `${reply} ${words[i]}`;
				i += 1;
				timer = setTimeout(word, WORD_MS);
				return;
			}
			streaming = false;
			timer = setTimeout(restart, READ_MS);
		}

		function restart() {
			reply = "";
			i = 0;
			streaming = true;
			timer = setTimeout(word, 400);
		}

		restart();
		return () => clearTimeout(timer);
	});
</script>

<div class="h-[26rem] w-full max-w-xl">
	<ChatPanel sound {streaming} empty={false}>
		{#snippet header()}
			<div class="flex items-center justify-between gap-3 px-4 py-3">
				<!--
					A paragraph rather than a heading: the panel is already a named region,
					and a heading here would file a demo's title in the page's contents.
				-->
				<p class="text-sm font-semibold">Scrolling behaviour</p>
				<span class="text-muted-foreground font-mono text-xs">balanced · 200k</span>
			</div>
		{/snippet}

		<div class="flex flex-col gap-5 px-4 py-4">
			<!-- The index guards the key: a transcript can carry the same id twice. -->
			{#each turns as turn, i (`${turn.id}#${i}`)}
				<ChatMessage role={turn.role} content={turn.content} />
			{/each}

			<ChatMessage role="assistant" content={reply} {streaming} />
		</div>

		{#snippet composer()}
			<div class="p-3">
				<Composer sound bind:value={draft} placeholder="Ask a follow-up" onSubmit={send} />
			</div>
		{/snippet}
	</ChatPanel>
</div>
