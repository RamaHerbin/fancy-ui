<script lang="ts">
	import { onMount } from "svelte";
	import { PromptSuggestions } from "$lib/fancy-ui/prompt-suggestions";

	const SUGGESTIONS = [
		"Why was the lockfile stale?",
		"Show me the failing job",
		"Turn the cache back on",
		"Summarize this for the team",
	];

	/** How long the reply sits alone before the follow-ups offer themselves. */
	const APPEAR_MS = 700;
	/** The beat the pills spend hidden before replaying, after one is picked. */
	const REPLAY_MS = 260;

	let visible = $state(false);
	let turns = $state<string[]>([]);

	let timer: ReturnType<typeof setTimeout> | undefined;
	let reduced = false;

	onMount(() => {
		reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		// Nothing to stage when motion is reduced: the follow-ups are simply there,
		// which is the state the delay was building towards anyway.
		if (reduced) {
			visible = true;
			return;
		}

		timer = setTimeout(() => (visible = true), APPEAR_MS);
		return () => clearTimeout(timer);
	});

	function select(suggestion: string) {
		turns = [...turns, suggestion];

		// Hiding and re-showing is what replays the cascade — worth seeing once you
		// have picked one, but only when motion is welcome.
		if (reduced) return;
		visible = false;
		clearTimeout(timer);
		timer = setTimeout(() => (visible = true), REPLAY_MS);
	}
</script>

<div class="flex w-full max-w-xl flex-col gap-3">
	<div class="bg-muted text-foreground mr-auto max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3">
		<p class="text-sm leading-relaxed">
			The build is green again. The failure came from a stale lockfile in the CI cache rather than
			from anything in your branch — I re-ran the job with the cache disabled and every suite passed
			on the first attempt.
		</p>
	</div>

	{#each turns as turn, i (i)}
		<div
			class="bg-primary text-primary-foreground ml-auto max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5"
		>
			<p class="text-sm">{turn}</p>
		</div>
	{/each}

	<PromptSuggestions
		suggestions={SUGGESTIONS}
		{visible}
		onSelect={select}
		label="Follow-up prompts"
		class="mt-1"
	/>
</div>
