<script lang="ts">
	import { onMount } from "svelte";
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { StreamingText } from "$lib/fancy-ui/streaming-text";

	let { values }: { values: PlaygroundValues } = $props();

	const SOURCE =
		"Each chunk arrives tinted and settles into the paragraph a moment later, so the seam between what was there and what just came in stays legible.";
	const words = SOURCE.split(" ");

	let text = $state("");
	let streaming = $state(false);

	onMount(() => {
		// A loop that keeps re-animating is what reduced motion asks us not to run.
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			text = SOURCE;
			return;
		}

		let timer: ReturnType<typeof setTimeout>;
		let i = 0;

		function tick() {
			if (i < words.length) {
				// The whole text so far, never the delta.
				text = i === 0 ? words[0] : `${text} ${words[i]}`;
				i += 1;
				timer = setTimeout(tick, 110);
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

<div class="flex h-full w-full items-center justify-center p-6">
	<div class="bg-card w-full max-w-[320px] rounded-2xl border p-4">
		<p class="text-muted-foreground mb-2 font-mono text-[10px] tracking-widest uppercase">
			Assistant
		</p>
		<StreamingText
			{text}
			{streaming}
			tintColor={values.tintColor as string}
			settleMs={values.settleMs as number}
			class="text-sm leading-relaxed"
		/>
	</div>
</div>
