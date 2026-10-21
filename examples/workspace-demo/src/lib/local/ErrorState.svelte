<script lang="ts">
	import { Button } from "fancy-ui-svelte";

	// A failed load: announced as an alert, with Retry when trying again can
	// help. `retrying` keeps the button in place and busy instead of removing
	// it, so focus is not lost while the next attempt runs.
	let {
		title,
		description,
		retryLabel = "Try again",
		retryable = true,
		retrying = false,
		onretry,
		class: className = "",
	}: {
		title: string;
		description?: string;
		retryLabel?: string;
		retryable?: boolean;
		retrying?: boolean;
		onretry?: () => void;
		class?: string;
	} = $props();
</script>

<div
	role="alert"
	class="border-border flex flex-col items-center gap-3 rounded-xl border px-4 py-10 text-center {className}"
	data-error-state
>
	<p class="text-base font-medium">{title}</p>
	{#if description}
		<p class="text-muted-foreground max-w-sm text-sm">{description}</p>
	{/if}
	{#if retryable}
		<Button variant="outline" aria-busy={retrying} loading={retrying} onclick={() => onretry?.()}>
			{retryLabel}
		</Button>
	{/if}
</div>
