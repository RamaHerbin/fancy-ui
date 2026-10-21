<script lang="ts">
	import { FollowButton } from "$lib/fancy-ui/follow-button";
	import { Switch } from "$lib/fancy-ui/switch";

	let following = $state(false);
	let failNext = $state(false);

	// A fake server: every request takes 800 ms. With the switch on, the next one
	// is refused (and the switch turns itself off), so the rollback and the retry
	// can both be watched.
	async function onToggle(_next: boolean) {
		// Read and consume the flag when the request STARTS: a request sent under
		// "Fail next request" fails even if the switch is turned off meanwhile.
		const refuse = failNext;
		failNext = false;
		await new Promise((resolve) => setTimeout(resolve, 800));
		if (refuse) throw new Error("The server said no");
	}
</script>

<div class="flex flex-col items-center gap-4">
	<FollowButton sound bind:following {onToggle} label="Follow Rama" />
	<Switch bind:checked={failNext}>Fail next request</Switch>
</div>
