<script lang="ts">
	import { FlipCard } from "$lib/fancy-ui/flip-card";

	let flipped = $state(false);
</script>

<div class="flex flex-col items-center gap-4">
	<FlipCard trigger="click" bind:flipped label="Membership card">
		<div
			class="flex size-full flex-col justify-between bg-gradient-to-br from-zinc-800 to-zinc-950 p-5 text-white"
		>
			<p class="text-xs tracking-widest text-white/60 uppercase">Member</p>
			<p class="text-2xl font-semibold">Ada Lovelace</p>
			<p class="text-xs text-white/60">Tap or press Enter to flip</p>
		</div>
		{#snippet back()}
			<div class="flex size-full flex-col justify-between">
				<p class="text-sm font-semibold">Perks</p>
				<ul class="text-muted-foreground space-y-1 text-sm">
					<li>Early access</li>
					<li>Priority support</li>
				</ul>
				<a class="text-sm font-medium underline underline-offset-4" href="#perks">
					See all perks
				</a>
			</div>
		{/snippet}
	</FlipCard>
	<button
		class="text-muted-foreground rounded-md border px-3 py-1.5 text-xs"
		onclick={() => (flipped = !flipped)}
	>
		{flipped ? "Show front" : "Show back"} (bind:flipped)
	</button>
</div>
