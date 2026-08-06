<script lang="ts">
	import { onMount } from "svelte";
	import { StreamingText } from "$lib/fancy-ui/streaming-text";

	const source =
		"A model answers one token at a time, so the surface it lands on should show that. Each chunk arrives tinted and settles into the paragraph a moment later, which makes the seam between what was already there and what just came in legible without moving any of the text around.";

	const words = source.split(" ");

	let text = $state("");
	let streaming = $state(false);

	onMount(() => {
		// A looping demo that keeps re-animating is exactly what reduced motion is
		// asking us not to do, so it gets the finished answer instead.
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			text = source;
			return;
		}

		let timer: ReturnType<typeof setTimeout>;
		let i = 0;

		function tick() {
			if (i < words.length) {
				// The whole text so far, never the delta — that is the contract.
				text = i === 0 ? words[0] : `${text} ${words[i]}`;
				i += 1;
				timer = setTimeout(tick, 90);
				return;
			}
			streaming = false;
			timer = setTimeout(restart, 2400);
		}

		function restart() {
			text = "";
			i = 0;
			streaming = true;
			timer = setTimeout(tick, 160);
		}

		restart();
		return () => clearTimeout(timer);
	});
</script>

<div class="bg-card w-full max-w-xl rounded-lg border p-5">
	<p class="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">Assistant</p>
	<StreamingText {text} {streaming} class="text-sm leading-relaxed" tintColor="#6366f1" />
</div>
