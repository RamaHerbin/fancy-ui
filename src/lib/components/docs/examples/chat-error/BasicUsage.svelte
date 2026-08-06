<script lang="ts">
	import { onMount } from "svelte";
	import { ChatError } from "$lib/fancy-ui/chat-error";

	/** How long the pretend request takes before it comes back green. */
	const RETRY_MS = 1500;

	let phase = $state<"failed" | "retrying" | "recovered">("failed");
	let timer: ReturnType<typeof setTimeout> | undefined;

	function retry() {
		phase = "retrying";
		timer = setTimeout(() => {
			timer = undefined;
			phase = "recovered";
		}, RETRY_MS);
	}

	function replay() {
		clearTimeout(timer);
		timer = undefined;
		phase = "failed";
	}

	// The pending retry outlives nothing: clear it if the reader navigates away
	// mid-flight.
	onMount(() => () => clearTimeout(timer));
</script>

<div class="flex w-full max-w-md flex-col gap-3 p-6">
	<div class="bg-primary text-primary-foreground ml-auto rounded-2xl rounded-br-sm px-4 py-2.5">
		<p class="text-sm">What changed in yesterday's deploy?</p>
	</div>

	{#if phase === "recovered"}
		<div class="bg-muted mr-auto rounded-2xl rounded-bl-sm px-4 py-2.5">
			<p class="text-sm leading-relaxed">
				Three commits landed: a cache fix, the new export endpoint, and a dependency bump.
			</p>
		</div>
		<button
			type="button"
			class="text-muted-foreground hover:text-foreground self-start text-xs underline underline-offset-4"
			onclick={replay}
		>
			Replay the failure
		</button>
	{:else}
		<ChatError
			message="The assistant couldn't finish that reply"
			detail="network_error · request 8f21c0"
			onRetry={retry}
			retrying={phase === "retrying"}
		/>
	{/if}
</div>
