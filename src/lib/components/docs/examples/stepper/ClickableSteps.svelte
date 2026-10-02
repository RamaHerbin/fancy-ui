<script lang="ts">
	import { Stepper, Step } from "$lib/fancy-ui/stepper";

	let current = $state(0);
	let lastClicked = $state<number | null>(null);

	function onStepClick(index: number) {
		lastClicked = index;
	}
</script>

<div
	class="w-full max-w-xl rounded-[20px] border border-black/[0.08] bg-[#f4f4f5] p-1.5 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
>
	<div
		class="rounded-[14px] border border-black/[0.08] bg-[#fafafa] px-4 pt-6 pb-4 sm:px-6 dark:border-white/[0.06] dark:bg-[#141416]"
	>
		<Stepper sound bind:current clickable {onStepClick}>
			<Step label="Account" />
			<Step label="Profile" />
			<Step label="Billing" />
			<Step label="Confirmation" />
		</Stepper>
		<p class="text-muted-foreground mt-5 text-center text-xs" aria-live="polite">
			{#if lastClicked !== null}
				Jumped to step {lastClicked + 1}.
			{:else}
				Click the last step to send light down every rail.
			{/if}
		</p>
	</div>
</div>
