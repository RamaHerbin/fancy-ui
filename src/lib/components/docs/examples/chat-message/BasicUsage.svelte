<script lang="ts">
	import { onMount } from "svelte";
	import {
		ChatMessage,
		ChatMessageActions,
		ChatMessageAction,
		ChatMessageBranches,
	} from "$lib/fancy-ui/chat-message";

	const question = "What makes a transcript read like a conversation instead of a log?";
	const answer =
		"Two things, mostly. The turns are told apart by shape rather than by a label — a filled bubble on the right for you, plain flowing text on the left for the answer — and the controls stay out of the way until you reach for them. Everything else is the same message component wearing a different role.";

	const words = answer.split(" ");
	const askedAt = Date.now() - 4 * 60 * 1000;

	let reply = $state("");
	let streaming = $state(false);
	let version = $state(2);
	let liked = $state(false);

	onMount(() => {
		// A transcript that keeps retyping itself is what reduced motion is asking
		// us not to do, so it gets the finished answer instead.
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			reply = answer;
			return;
		}

		let timer: ReturnType<typeof setTimeout>;
		let i = 0;

		function tick() {
			if (i < words.length) {
				// The whole reply so far, never just the delta — that is the contract.
				reply = i === 0 ? words[0] : `${reply} ${words[i]}`;
				i += 1;
				timer = setTimeout(tick, 55);
				return;
			}
			streaming = false;
			timer = setTimeout(restart, 3200);
		}

		function restart() {
			reply = "";
			i = 0;
			streaming = true;
			timer = setTimeout(tick, 400);
		}

		restart();
		return () => clearTimeout(timer);
	});

	async function copyReply() {
		if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
		try {
			await navigator.clipboard.writeText(reply);
		} catch {
			// Denied permission or an insecure context: nothing to recover from.
		}
	}
</script>

<div class="bg-card flex w-full max-w-xl flex-col gap-6 rounded-lg border p-5">
	<ChatMessage role="user" content={question} timestamp={askedAt}>
		{#snippet avatar()}
			<span
				class="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold"
			>
				YOU
			</span>
		{/snippet}
	</ChatMessage>

	<ChatMessage role="assistant" content={reply} {streaming} timestamp={askedAt + 6000}>
		{#snippet avatar()}
			<span
				class="flex size-8 items-center justify-center rounded-full bg-indigo-500/15 text-xs font-semibold text-indigo-500"
			>
				AI
			</span>
		{/snippet}

		{#snippet actions()}
			<ChatMessageActions>
				<ChatMessageAction label="Copy answer" confirmLabel="Copied" onclick={copyReply}>
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

				<ChatMessageAction label="Regenerate" onclick={() => {}}>
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
						<path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
						<path d="M21 3v5h-5" />
						<path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
						<path d="M3 21v-5h5" />
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
