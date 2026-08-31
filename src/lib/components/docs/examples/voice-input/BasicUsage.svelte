<script lang="ts">
	import { onMount } from "svelte";
	import { VoiceInput } from "$lib/fancy-ui/voice-input";

	/** How fast the pretend recogniser hands back another word. */
	const WORD_MS = 400;
	const WORDS = "show me the retry policy for failed webhook deliveries".split(" ");

	let active = $state(false);
	let transcript = $state("");

	// Plain, not reactive: it is the rig's cursor into WORDS, not something the
	// markup reads.
	let spoken = 0;

	function reset() {
		spoken = 0;
		transcript = "";
	}

	onMount(() => {
		// A transcript that types itself is exactly the motion this setting asks us
		// not to run, so it gets the finished state instead: the panel already open,
		// the sentence already said, and no timer of any kind.
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			active = true;
			transcript = WORDS.join(" ");
			return;
		}

		// One interval for the life of the example rather than one per recording:
		// it reads `active` each tick and does nothing until the mic is pressed.
		const timer = setInterval(() => {
			if (!active || spoken >= WORDS.length) return;
			transcript = transcript ? `${transcript} ${WORDS[spoken]}` : WORDS[spoken];
			spoken += 1;
		}, WORD_MS);
		return () => clearInterval(timer);
	});
</script>

<div class="flex w-full max-w-md flex-col gap-3 p-6">
	<!--
		`demo` draws the synthetic waveform, because this page has no microphone
		behind it. A real integration drops that and passes `samples` from its own
		audio pipeline instead.
	-->
	<VoiceInput sound bind:active {transcript} demo onStop={reset} onCancel={reset} />

	<p class="text-muted-foreground text-xs">
		Press the mic and the words arrive as a recogniser would hand them over. The check keeps the
		transcript and closes the panel; the cross throws it away.
	</p>
</div>
