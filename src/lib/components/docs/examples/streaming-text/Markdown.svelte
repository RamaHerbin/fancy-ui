<script lang="ts">
	import { onMount } from "svelte";
	import { StreamingText } from "$lib/fancy-ui/streaming-text";

	const source = `**Markdown mode** re-parses the whole document on every chunk, so structure appears the moment it becomes valid:

- a bullet resolves as soon as its line is complete
- inline \`code\` and **emphasis** snap in mid-sentence

\`\`\`ts
const res = await fetch("/api/chat");
\`\`\`

There is no delta tint here — only plain mode can wrap new text in a span of its own.`;

	const words = source.split(" ");

	let text = $state("");
	let streaming = $state(false);

	onMount(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			text = source;
			return;
		}

		let timer: ReturnType<typeof setTimeout>;
		let i = 0;

		function tick() {
			if (i < words.length) {
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
	<StreamingText {text} {streaming} markdown class="text-sm" />
</div>
