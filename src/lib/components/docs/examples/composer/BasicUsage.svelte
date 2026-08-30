<script lang="ts">
	import { onMount } from "svelte";
	import { Composer } from "$lib/fancy-ui/composer";

	/** What the rig types when nobody has taken the keyboard yet. */
	const QUESTION = "Why did the deploy stall?";

	/** Between keystrokes while the rig types. */
	const KEY_MS = 55;
	/** The beat between the last keystroke and the send. */
	const SEND_MS = 520;
	/** Before the first word of a reply, and between the words after it. */
	const REPLY_MS = 380;
	const WORD_MS = 32;
	/** How long a finished answer sits there before the rig starts over. */
	const READ_MS = 3200;

	let draft = $state("");
	let reply = $state("");
	let streaming = $state(false);

	let timer: ReturnType<typeof setTimeout> | undefined;
	let typed = 0;
	/** True while the rig owns the composer. A person touching it takes it back. */
	let driving = false;
	let reduced = false;

	/**
	 * The fake model. It answers the prompt it was handed and nothing is behind it
	 * — which is the honest thing for a docs page to demonstrate.
	 */
	function sentenceFor(prompt: string): string {
		return `You asked: “${prompt}” — and nothing is wired up behind this composer. The reply is on a timer, arriving one word at a time so the send button has something to turn into.`;
	}

	function answer(prompt: string) {
		clearTimeout(timer);
		const words = sentenceFor(prompt).split(" ");

		// Reduced motion gets the finished answer: a reply that types itself is the
		// motion this setting is asking us not to run.
		if (reduced) {
			reply = words.join(" ");
			streaming = false;
			return;
		}

		reply = "";
		streaming = true;
		let i = 0;

		function chunk() {
			if (i < words.length) {
				reply = i === 0 ? words[0] : `${reply} ${words[i]}`;
				i += 1;
				timer = setTimeout(chunk, WORD_MS);
				return;
			}
			streaming = false;
			if (driving) timer = setTimeout(restart, READ_MS);
		}

		timer = setTimeout(chunk, REPLY_MS);
	}

	/** The composer clears its own text on a successful send; the reply is ours. */
	function send(payload: { text: string }) {
		answer(payload.text);
	}

	/** What the stop button does here: drop the rest of the sentence and stand down. */
	function halt() {
		clearTimeout(timer);
		streaming = false;
		if (driving) timer = setTimeout(restart, READ_MS);
	}

	function typeNext() {
		if (typed < QUESTION.length) {
			typed += 1;
			draft = QUESTION.slice(0, typed);
			timer = setTimeout(typeNext, KEY_MS);
			return;
		}
		timer = setTimeout(() => {
			const text = draft.trim();
			draft = "";
			answer(text);
		}, SEND_MS);
	}

	function restart() {
		reply = "";
		draft = "";
		typed = 0;
		timer = setTimeout(typeNext, KEY_MS);
	}

	/** The demo is yours the moment you reach for it, and the rig does not fight you. */
	function handOver() {
		if (!driving) return;
		driving = false;
		clearTimeout(timer);
	}

	onMount(() => {
		reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		// Nothing loops under reduced motion: one answered question, already there,
		// and an empty composer waiting for a real one.
		if (reduced) {
			reply = sentenceFor(QUESTION);
			return;
		}

		driving = true;
		timer = setTimeout(typeNext, READ_MS / 4);
		return () => {
			driving = false;
			clearTimeout(timer);
		};
	});
</script>

<!-- Capture, so the hand-over happens before the composer's own handlers run. -->
<div
	class="flex w-full max-w-xl flex-col gap-3 p-6"
	onpointerdowncapture={handOver}
	onkeydowncapture={handOver}
>
	{#if reply}
		<div class="bg-muted text-foreground mr-auto max-w-[90%] rounded-2xl rounded-bl-sm px-4 py-3">
			<p class="text-sm leading-relaxed">{reply}</p>
		</div>
	{/if}

	<Composer
		sound
		bind:value={draft}
		{streaming}
		placeholder="Ask anything"
		onSubmit={send}
		onStop={halt}
	/>

	<p class="text-muted-foreground text-xs">
		Enter sends, Shift+Enter adds a line. While the reply streams the send button becomes a stop
		button, and the composer refuses to send again until it lands.
	</p>
</div>
