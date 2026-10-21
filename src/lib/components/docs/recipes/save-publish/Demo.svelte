<script lang="ts">
	import { Button } from "$lib/fancy-ui/button";
	import { StatusMorph, type StatusMorphProps } from "$lib/fancy-ui/status-morph";
	import { Toaster, toast, dismissToast } from "$lib/fancy-ui/toast";

	// Stand-in for your request: resolves after a short delay, or rejects while
	// "fail the next save" is ticked.
	let failNext = $state(false);
	function saveDraft(): Promise<void> {
		return new Promise((resolve, reject) => {
			setTimeout(() => (failNext ? reject(new Error("offline")) : resolve()), 1200);
		});
	}

	let status = $state<NonNullable<StatusMorphProps["state"]>>("idle");

	async function publish() {
		if (status === "loading") return;
		status = "loading";
		try {
			await saveDraft();
			// Success is only ever shown once the request has resolved.
			status = "success";
		} catch {
			status = "error";
			const id = toast({
				title: "Could not publish",
				description: "Check your connection and try again.",
				variant: "error",
				action: {
					label: "Retry",
					onClick: () => {
						dismissToast(id);
						void publish();
					},
				},
			});
		}
	}
</script>

<Toaster />
<div class="flex flex-wrap items-center gap-4">
	<Button onclick={publish}>
		Publish
		{#snippet iconEnd()}
			<StatusMorph bind:state={status} />
		{/snippet}
	</Button>
	<label class="text-muted-foreground flex items-center gap-2 text-sm">
		<input type="checkbox" bind:checked={failNext} />
		Fail the next save
	</label>
</div>
